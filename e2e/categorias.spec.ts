import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarCategoriaTeste,
  criarProdutoTeste,
  criarUsuarioTeste,
  limparCatalogo,
  limparUsuarios,
  type DadosUsuarioTeste,
} from "./apoio/supabase"

const DONA: DadosUsuarioTeste = {
  email: "dona@loja.test",
  senha: "SenhaDona123",
  nome: "Dona",
  papel: "administrador",
}
const FUNC: DadosUsuarioTeste = {
  email: "func@loja.test",
  senha: "SenhaFunc123",
  nome: "Func",
  papel: "funcionario",
}

async function abrirCategorias(page: Page) {
  await entrarComoAdministrador(page, DONA)
  await page.getByRole("link", { name: "Categorias" }).click()
  await expect(page.getByRole("heading", { name: "Categorias", level: 1 })).toBeVisible()
}

async function criarCategoria(page: Page, nome: string, dentroDe = "Raiz") {
  await campo(page, "Nova categoria").fill(nome)
  await campo(page, "Dentro de").selectOption({ label: dentroDe })
  await page.getByRole("button", { name: "Criar categoria" }).click()
}

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

test("cria categoria e subcategoria e mostra na árvore", async ({ page }) => {
  await abrirCategorias(page)
  await criarCategoria(page, "Bolos")
  await expect(page.getByRole("listitem").filter({ hasText: "Bolos" }).first()).toBeVisible()
  await criarCategoria(page, "Caixas para bolo", "Bolos")
  await expect(
    page.getByRole("list", { name: "Dentro de Bolos" }).getByText("Caixas para bolo"),
  ).toBeVisible()
})

test("nome repetido no mesmo nível mostra a mensagem", async ({ page }) => {
  await abrirCategorias(page)
  await criarCategoria(page, "Bolos")
  await expect(page.getByRole("button", { name: "Apagar Bolos" })).toBeVisible()
  await criarCategoria(page, "bolos")
  await expect(page.getByText("Já existe uma categoria com este nome aqui.")).toBeVisible()
})

test("categoria com subcategoria não é apagada", async ({ page }) => {
  const bolos = await criarCategoriaTeste("Bolos")
  await criarCategoriaTeste("Caixas para bolo", bolos)
  await abrirCategorias(page)
  await page.getByRole("button", { name: "Apagar Bolos" }).click()
  await expect(
    page.getByText("Esta categoria tem subcategorias ou produtos e não pode ser apagada."),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByRole("button", { name: "Apagar Bolos" })).toBeVisible()
})

test("categoria com produto não é apagada", async ({ page }) => {
  const doces = await criarCategoriaTeste("Doces")
  await criarProdutoTeste({ nome: "Forminha nº 4", categorias: [doces] })
  await abrirCategorias(page)
  await page.getByRole("button", { name: "Apagar Doces" }).click()
  await expect(
    page.getByText("Esta categoria tem subcategorias ou produtos e não pode ser apagada."),
  ).toBeVisible()
})

test("cria material e não aceita repetido", async ({ page }) => {
  await abrirCategorias(page)
  await campo(page, "Novo material").fill("Kraft")
  await page.getByRole("button", { name: "Adicionar material" }).click()
  await expect(page.getByRole("button", { name: "Apagar material Kraft" })).toBeVisible()
  await campo(page, "Novo material").fill("kraft")
  await page.getByRole("button", { name: "Adicionar material" }).click()
  await expect(page.getByText("Este material já existe.")).toBeVisible()
})

test("funcionária não vê Categorias no menu e /categorias é sem permissão", async ({ page }) => {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Categorias" })).toHaveCount(0)
  await page.goto("/categorias")
  await expect(page.getByText("Você não tem permissão para acessar esta página.")).toBeVisible()
})
