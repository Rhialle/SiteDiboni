import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  codigoInternoDe,
  criarEstoqueTeste,
  criarFormaTeste,
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

// --- Entrada manual (só administrador) ---

// A página da variação tem dois formulários com campos de mesmo nome: cada um fica na sua seção.
const secao = (page: Page, titulo: string) => page.getByRole("region", { name: titulo })
const campoEm = (page: Page, titulo: string, rotulo: string) =>
  secao(page, titulo).getByLabel(rotulo, { exact: true }).filter({ visible: true })

async function darEntrada(
  page: Page,
  dados: { quantidade: string; em?: string; custo: string; validade?: string; lote?: string; motivo?: string },
) {
  await campoEm(page, "Entrada manual", "Quantidade").fill(dados.quantidade)
  if (dados.em) await campoEm(page, "Entrada manual", "Em").selectOption({ label: dados.em })
  await campoEm(page, "Entrada manual", "Custo (R$)").fill(dados.custo)
  if (dados.validade) await campoEm(page, "Entrada manual", "Validade").fill(dados.validade)
  if (dados.lote) await campoEm(page, "Entrada manual", "Lote (opcional)").fill(dados.lote)
  await campoEm(page, "Entrada manual", "Motivo").fill(dados.motivo ?? "compra no atacado")
  await secao(page, "Entrada manual").getByRole("button", { name: "Registrar entrada" }).click()
}

test("administrador dá entrada de 3 Caixas com 100 a R$ 12,00 a caixa: lote ENT de hoje com 300 un e custo médio R$ 0,12", async ({ page }) => {
  const copo = await criarProdutoTeste({ nome: "Copo", controla_validade: true })
  await criarFormaTeste(copo.variacaoId, { nome: "Caixa com 100", fator: 100, preco_centavos: 1500 })
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${copo.variacaoId}`)

  await darEntrada(page, { quantidade: "3", em: "Caixa com 100", custo: "12,00", validade: dataDaqui(90) })
  await expect(secao(page, "Entrada manual").getByText("Entrada registrada.")).toBeVisible()
  const lote = page.getByRole("table", { name: "Lotes" }).locator("tbody tr")
  await expect(lote).toHaveCount(1)
  await expect(lote).toContainText(`ENT-${dataDaqui(0)}`)
  await expect(lote).toContainText("300 un")
  await expect(page.getByText("Custo médio: R$ 0,12")).toBeVisible()
})

test("entrada sem custo mostra a mensagem e não muda o saldo", async ({ page }) => {
  const { forminha } = await prepararEstoque()
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${forminha.variacaoId}`)

  await darEntrada(page, { quantidade: "10", custo: "" })
  await expect(page.getByText("Informe o custo (brinde ou amostra entra com 0,00).")).toBeVisible()
  await expect(page.getByText("Saldo: 300 un")).toBeVisible()
})

test("produto com validade sem a data mostra a mensagem", async ({ page }) => {
  const copo = await criarProdutoTeste({ nome: "Copo", controla_validade: true })
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${copo.variacaoId}`)

  await darEntrada(page, { quantidade: "10", custo: "0,10" })
  await expect(page.getByText("Informe a validade: este produto controla validade.")).toBeVisible()
})

test("granulado: 1,250 kg entra como 1.250 g", async ({ page }) => {
  const granulado = await criarProdutoTeste({ nome: "Granulado", tipo_venda: "peso", controla_validade: true })
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${granulado.variacaoId}`)

  await darEntrada(page, { quantidade: "1,250", em: "kg", custo: "32,00", validade: dataDaqui(30), lote: "L-77" })
  await expect(secao(page, "Entrada manual").getByText("Entrada registrada.")).toBeVisible()
  const lote = page.getByRole("table", { name: "Lotes" }).locator("tbody tr")
  await expect(lote).toContainText("L-77")
  await expect(lote).toContainText("1.250 g")
  await expect(page.getByText("Custo médio: R$ 0,032")).toBeVisible()
})

test("funcionária não vê o formulário de entrada manual", async ({ page }) => {
  const { forminha } = await prepararEstoque()
  await entrarComoFuncionaria(page)
  await page.goto(`/estoque/${forminha.variacaoId}`)
  await expect(page.getByText("Saldo: 300 un")).toBeVisible()
  await expect(secao(page, "Entrada manual")).toHaveCount(0)
})

test("produto sem controle de validade mostra só o saldo, sem a tabela de lotes", async ({ page }) => {
  const { forminha } = await prepararEstoque()
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${forminha.variacaoId}`)
  await expect(page.getByText("Saldo: 300 un")).toBeVisible()
  await expect(page.getByRole("table", { name: "Lotes" })).toHaveCount(0)
})
