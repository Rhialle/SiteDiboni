import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  codigoInternoDe,
  criarEstoqueTeste,
  criarProdutoTeste,
  criarUsuarioTeste,
  dataDaqui,
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

let donaId: string

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  donaId = await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

const linha = (page: Page, nome: string) => page.getByRole("row").filter({ hasText: nome })

// Forminha (por unidade, sem validade): 300 un a R$ 0,05.
// Granulado (por peso, com validade): 500 g vencendo em 60 dias e 200 g vencidos.
async function prepararEstoque() {
  const forminha = await criarProdutoTeste({ nome: "Forminha" })
  await criarEstoqueTeste(forminha.variacaoId, { quantidade: 300, custo: 0.05, usuarioId: donaId })
  const granulado = await criarProdutoTeste({ nome: "Granulado", tipo_venda: "peso", controla_validade: true })
  await criarEstoqueTeste(granulado.variacaoId, {
    quantidade: 500, custo: 0.03, usuarioId: donaId, validade: dataDaqui(60), codigo: "BOM",
  })
  await criarEstoqueTeste(granulado.variacaoId, {
    quantidade: 200, custo: 0.03, usuarioId: donaId, validade: dataDaqui(-1), codigo: "VELHO",
  })
  return { forminha, granulado }
}

async function entrarComoFuncionaria(page: Page) {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
}

test("lista mostra saldo total e disponível; a busca acha pelo código interno", async ({ page }) => {
  const { forminha } = await prepararEstoque()
  await entrarComoAdministrador(page, DONA)
  await page.getByRole("link", { name: "Estoque", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Estoque", level: 1 })).toBeVisible()

  await expect(linha(page, "Forminha")).toContainText("300 un")
  await expect(linha(page, "Granulado")).toContainText("700 g")
  await expect(linha(page, "Granulado")).toContainText("500 g")

  await campo(page, "Buscar").fill(await codigoInternoDe(forminha.variacaoId))
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(linha(page, "Forminha")).toBeVisible()
  await expect(linha(page, "Granulado")).toHaveCount(0)
})

test("página da variação mostra os lotes por validade, com o vencido marcado e o total", async ({ page }) => {
  const { granulado } = await prepararEstoque()
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${granulado.variacaoId}`)

  const lotes = page.getByRole("table", { name: "Lotes" }).locator("tbody tr")
  await expect(lotes).toHaveCount(2)
  await expect(lotes.nth(0)).toContainText("VELHO")
  await expect(lotes.nth(0)).toContainText("Vencido")
  await expect(lotes.nth(1)).toContainText("BOM")
  await expect(lotes.nth(1)).not.toContainText("Vencido")
  await expect(page.getByText("Saldo: 700 g")).toBeVisible()
  await expect(page.getByText("Disponível: 500 g")).toBeVisible()
})

test("administrador vê o custo médio; funcionária não vê nenhum custo", async ({ page }) => {
  const { forminha } = await prepararEstoque()
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${forminha.variacaoId}`)
  await expect(page.getByText("Custo médio: R$ 0,05")).toBeVisible()

  await page.getByRole("button", { name: "Sair" }).click()
  await entrarComoFuncionaria(page)
  await page.goto(`/estoque/${forminha.variacaoId}`)
  await expect(page.getByText("Saldo: 300 un")).toBeVisible()
  await expect(page.getByText(/custo/i)).toHaveCount(0)
})

test("produto sem controle de validade mostra só o saldo, sem a tabela de lotes", async ({ page }) => {
  const { forminha } = await prepararEstoque()
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${forminha.variacaoId}`)
  await expect(page.getByText("Saldo: 300 un")).toBeVisible()
  await expect(page.getByRole("table", { name: "Lotes" })).toHaveCount(0)
})
