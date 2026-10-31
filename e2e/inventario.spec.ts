import { expect, test, type Page } from "@playwright/test"

import { criarInventarioTeste } from "./apoio/banco"
import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarCategoriaTeste,
  criarProdutoTeste,
  criarUsuarioTeste,
  limparCatalogo,
  limparUsuarios,
  restaurarConfiguracoes,
  type DadosUsuarioTeste,
} from "./apoio/supabase"

const DONA: DadosUsuarioTeste = { email: "dona@loja.test", senha: "SenhaDona123", nome: "Dona", papel: "administrador" }
const FUNC: DadosUsuarioTeste = { email: "func@loja.test", senha: "SenhaFunc123", nome: "Func", papel: "funcionario" }

let donaId = ""

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  await restaurarConfiguracoes()
  donaId = await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

const textoNaTela = (page: Page, texto: string) => page.getByText(texto).filter({ visible: true })
const linha = (page: Page, texto: string) => page.getByRole("row").filter({ hasText: texto })

async function entrarComoFuncionaria(page: Page) {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
}

// --- Lista e abertura (Task 4) ---

test("administrador abre inventário de uma categoria e vai para a contagem", async ({ page }) => {
  const confeitaria = await criarCategoriaTeste("Confeitaria")
  await criarProdutoTeste({ nome: "Forminha", categorias: [confeitaria] })
  await entrarComoAdministrador(page, DONA)
  await page.goto("/inventario")
  await expect(page.getByRole("heading", { name: "Inventário", level: 1 })).toBeVisible()
  await expect(textoNaTela(page, "Nenhum inventário.")).toBeVisible()

  await campo(page, "Descrição").fill("Prateleira 1")
  await page.getByRole("radio", { name: "Categorias" }).check()
  await page.getByRole("checkbox", { name: "Confeitaria" }).check()
  await page.getByRole("button", { name: "Abrir inventário" }).click()
  await expect(page).toHaveURL(/\/inventario\/\d+$/)

  await page.goto("/inventario")
  await expect(linha(page, "Prateleira 1")).toContainText("Em contagem")
  await expect(linha(page, "Prateleira 1")).toContainText("Categorias")
  await expect(linha(page, "Prateleira 1")).toContainText("Dona")
})

test("com um inventário em andamento, abrir outro mostra a mensagem", async ({ page }) => {
  await criarInventarioTeste("Prateleira 1", donaId)
  await entrarComoAdministrador(page, DONA)
  await page.goto("/inventario")
  await campo(page, "Descrição").fill("Prateleira 2")
  await page.getByRole("button", { name: "Abrir inventário" }).click()
  await expect(
    textoNaTela(page, "Já existe um inventário em andamento: termine ou cancele antes de abrir outro."),
  ).toBeVisible()
})

test("funcionária vê a lista e não vê a caixa de abrir", async ({ page }) => {
  await criarInventarioTeste("Prateleira 1", donaId)
  await entrarComoFuncionaria(page)
  await page.getByRole("link", { name: "Inventário" }).first().click()
  await expect(linha(page, "Prateleira 1")).toContainText("Em contagem")
  await expect(page.getByRole("button", { name: "Abrir inventário" })).toHaveCount(0)
})
