import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarFormaTeste,
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

async function abrirProdutoNovo(page: Page) {
  await entrarComoAdministrador(page, DONA)
  await page.goto("/produtos")
  await page.getByRole("link", { name: "Novo produto" }).click()
  await expect(page.getByRole("heading", { name: "Novo produto" })).toBeVisible()
}

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

test("administrador cria produto e cai na ficha com código interno e situação Incompleto", async ({ page }) => {
  await abrirProdutoNovo(page)
  await campo(page, "Nome").fill("Caixa para bolo")
  await page.getByRole("button", { name: "Criar produto" }).click()

  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { name: "Caixa para bolo" })).toBeVisible()
  await expect(page.getByText(/^P\d{6}$/)).toBeVisible()
  await expect(page.getByText("Incompleto", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Para ficar ativo falta: variação ativa com forma de venda, categoria, foto, NCM."),
  ).toBeVisible()
})

test("NCM com 7 dígitos mostra a mensagem", async ({ page }) => {
  await abrirProdutoNovo(page)
  await campo(page, "Nome").fill("Caixa para bolo")
  await campo(page, "NCM").fill("4819100")
  await page.getByRole("button", { name: "Criar produto" }).click()
  await expect(page.getByText("O NCM precisa ter 8 dígitos.")).toBeVisible()
})

test("código de barras inválido mostra a mensagem", async ({ page }) => {
  await abrirProdutoNovo(page)
  await campo(page, "Nome").fill("Caixa para bolo")
  await campo(page, "Código de barras").fill("4006381333932")
  await page.getByRole("button", { name: "Criar produto" }).click()
  await expect(page.getByText("Código de barras inválido.")).toBeVisible()
})

test("lista mostra situação e menor preço, e a busca acha pelo nome", async ({ page }) => {
  const caixa = await criarProdutoTeste({ nome: "Caixa para bolo" })
  await criarFormaTeste(caixa.variacaoId, { nome: "Pacote com 100", fator: 100, preco_centavos: 600 })
  await criarProdutoTeste({ nome: "Forminha nº 4" })

  await entrarComoAdministrador(page, DONA)
  await page.getByRole("link", { name: "Produtos" }).click()
  const linhaCaixa = page.getByRole("row").filter({ hasText: "Caixa para bolo" })
  await expect(linhaCaixa).toContainText("Incompleto")
  await expect(linhaCaixa).toContainText("R$ 6,00")
  await expect(page.getByRole("row").filter({ hasText: "Forminha nº 4" })).toBeVisible()

  await campo(page, "Buscar").fill("caixa")
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(page.getByRole("row").filter({ hasText: "Caixa para bolo" })).toBeVisible()
  await expect(page.getByRole("row").filter({ hasText: "Forminha nº 4" })).toHaveCount(0)
})

test("funcionária vê a lista sem o botão Novo produto", async ({ page }) => {
  await criarProdutoTeste({ nome: "Caixa para bolo" })
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.getByRole("link", { name: "Produtos" }).click()
  await expect(page.getByRole("row").filter({ hasText: "Caixa para bolo" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Novo produto" })).toHaveCount(0)
})
