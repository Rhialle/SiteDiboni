import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import { criarSolicitacaoTeste, movimentarTeste } from "./apoio/banco"
import {
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
let funcId: string

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  donaId = await criarUsuarioTeste(DONA)
  funcId = await criarUsuarioTeste(FUNC)
})

const linha = (page: Page, texto: string) => page.getByRole("row").filter({ hasText: texto })
const secao = (page: Page, titulo: string) => page.getByRole("region", { name: titulo })
const campoEm = (page: Page, titulo: string, rotulo: string) =>
  secao(page, titulo).getByLabel(rotulo, { exact: true }).filter({ visible: true })

async function entrarComoFuncionaria(page: Page) {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
}

// Forminha: 2.000 un a R$ 0,05 (limite padrão da funcionária: R$ 50,00 = 1.000 un).
async function forminhaComEstoque() {
  const forminha = await criarProdutoTeste({ nome: "Forminha" })
  await criarEstoqueTeste(forminha.variacaoId, { quantidade: 2000, custo: 0.05, usuarioId: donaId })
  return forminha
}

async function registrarPerda(page: Page, dados: { tipo: string; quantidade: string; motivo: string; lote?: string }) {
  if (dados.lote) await campoEm(page, "Perda ou ajuste", "Lote").selectOption({ label: dados.lote })
  await campoEm(page, "Perda ou ajuste", "Tipo").selectOption({ label: dados.tipo })
  await campoEm(page, "Perda ou ajuste", "Quantidade").fill(dados.quantidade)
  await campoEm(page, "Perda ou ajuste", "Motivo").fill(dados.motivo)
  await secao(page, "Perda ou ajuste").getByRole("button", { name: "Registrar" }).click()
}

test("funcionária registra perda por avaria dentro do limite: saldo cai", async ({ page }) => {
  const forminha = await forminhaComEstoque()
  await entrarComoFuncionaria(page)
  await page.goto(`/estoque/${forminha.variacaoId}`)

  await registrarPerda(page, { tipo: "Perda por avaria", quantidade: "10", motivo: "rasgou na prateleira" })
  await expect(secao(page, "Perda ou ajuste").getByText("Movimentação registrada.")).toBeVisible()
  await expect(page.getByText("Saldo: 1.990 un")).toBeVisible()
})

test("funcionária passa do limite: vira solicitação e o saldo não muda", async ({ page }) => {
  const forminha = await forminhaComEstoque()
  await entrarComoFuncionaria(page)
  await page.goto(`/estoque/${forminha.variacaoId}`)

  await registrarPerda(page, { tipo: "Perda por avaria", quantidade: "1500", motivo: "molhou no depósito" })
  await expect(
    page.getByText("Acima do seu limite: virou uma solicitação para o administrador aprovar."),
  ).toBeVisible()
  await expect(page.getByText("Saldo: 2.000 un")).toBeVisible()
})

test("administrador aprova a solicitação: o saldo cai; recusa outra: não muda", async ({ page }) => {
  const forminha = await forminhaComEstoque()
  await criarSolicitacaoTeste({ variacaoId: forminha.variacaoId, quantidade: -1500, motivo: "molhou", solicitadoPor: funcId })
  await criarSolicitacaoTeste({ variacaoId: forminha.variacaoId, quantidade: -1200, motivo: "rasgou", solicitadoPor: funcId })
  await entrarComoAdministrador(page, DONA)
  await page.goto("/estoque")
  await page.getByRole("link", { name: "Solicitações" }).click()
  await expect(page.getByRole("heading", { name: "Solicitações", level: 1 })).toBeVisible()

  await linha(page, "molhou").getByRole("button", { name: "Aprovar" }).click()
  await expect(linha(page, "molhou")).toContainText("Aprovada")
  await linha(page, "rasgou").getByRole("button", { name: "Recusar" }).click()
  await expect(linha(page, "rasgou")).toContainText("Recusada")

  await page.goto(`/estoque/${forminha.variacaoId}`)
  await expect(page.getByText("Saldo: 500 un")).toBeVisible()
})

test("funcionária vê só as próprias solicitações, sem os botões de decidir", async ({ page }) => {
  const forminha = await forminhaComEstoque()
  await criarSolicitacaoTeste({ variacaoId: forminha.variacaoId, quantidade: -1500, motivo: "da funcionária", solicitadoPor: funcId })
  await criarSolicitacaoTeste({ variacaoId: forminha.variacaoId, quantidade: -1200, motivo: "da dona", solicitadoPor: donaId })
  await entrarComoFuncionaria(page)
  await page.goto("/estoque/solicitacoes")

  await expect(linha(page, "da funcionária")).toContainText("Pendente")
  await expect(linha(page, "da dona")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0)
})

test("perda por vencimento só aparece para lote vencido", async ({ page }) => {
  const granulado = await criarProdutoTeste({ nome: "Granulado", tipo_venda: "peso", controla_validade: true })
  await criarEstoqueTeste(granulado.variacaoId, {
    quantidade: 500, custo: 0.03, usuarioId: donaId, validade: dataDaqui(60), codigo: "BOM",
  })
  await criarEstoqueTeste(granulado.variacaoId, {
    quantidade: 200, custo: 0.03, usuarioId: donaId, validade: dataDaqui(-1), codigo: "VELHO",
  })
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${granulado.variacaoId}`)

  const tipo = campoEm(page, "Perda ou ajuste", "Tipo")
  await campoEm(page, "Perda ou ajuste", "Lote").selectOption({ label: "BOM" })
  await expect(tipo.locator("option", { hasText: "Perda por vencimento" })).toHaveCount(0)
  await expect(tipo.locator("option", { hasText: "Quebra de pesagem" })).toHaveCount(1)

  await registrarPerda(page, { lote: "VELHO (vencido)", tipo: "Perda por vencimento", quantidade: "200", motivo: "venceu" })
  await expect(secao(page, "Perda ou ajuste").getByText("Movimentação registrada.")).toBeVisible()
  await expect(page.getByText("Saldo: 500 g")).toBeVisible()
})

// --- Extrato e estorno ---

async function estornar(page: Page, linhaDaMovimentacao: string, motivo: string) {
  await linha(page, linhaDaMovimentacao).getByRole("button", { name: "Estornar" }).click()
  await campo(page, "Motivo do estorno").fill(motivo)
  await page.getByRole("button", { name: "Confirmar estorno" }).click()
}

test("extrato filtra por tipo e por período, e mostra quem fez", async ({ page }) => {
  const forminha = await forminhaComEstoque()
  await movimentarTeste({ variacaoId: forminha.variacaoId, tipo: "perda_avaria", quantidade: -10, motivo: "rasgou", usuarioId: funcId })
  await entrarComoAdministrador(page, DONA)
  await page.goto("/estoque")
  await page.getByRole("link", { name: "Movimentações" }).click()
  await expect(page.getByRole("heading", { name: "Movimentações", level: 1 })).toBeVisible()

  await expect(linha(page, "Entrada manual")).toContainText("+2.000 un")
  await expect(linha(page, "Entrada manual")).toContainText("Dona")
  await expect(linha(page, "rasgou")).toContainText("-10 un")
  await expect(linha(page, "rasgou")).toContainText("Func")

  await campo(page, "Tipo").selectOption({ label: "Perda por avaria" })
  await page.getByRole("button", { name: "Filtrar" }).click()
  await expect(linha(page, "rasgou")).toBeVisible()
  await expect(linha(page, "Entrada manual")).toHaveCount(0)

  await campo(page, "Tipo").selectOption({ label: "Todos" })
  await campo(page, "De").fill(dataDaqui(1))
  await page.getByRole("button", { name: "Filtrar" }).click()
  await expect(page.getByText("Nenhuma movimentação.")).toBeVisible()
})

test("administrador estorna uma entrada: o saldo volta e a linha fica Estornada, sem botão", async ({ page }) => {
  const forminha = await criarProdutoTeste({ nome: "Forminha" })
  await criarEstoqueTeste(forminha.variacaoId, { quantidade: 300, custo: 0.05, usuarioId: donaId })
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/${forminha.variacaoId}`)
  await page.getByRole("link", { name: "Ver extrato" }).click()

  await estornar(page, "Entrada manual", "lançada em dobro")
  await expect(page.getByText("Estorno registrado.")).toBeVisible()
  await expect(linha(page, "Entrada manual")).toContainText("Estornada")
  await expect(linha(page, "Entrada manual").getByRole("button", { name: "Estornar" })).toHaveCount(0)
  await expect(linha(page, "lançada em dobro")).toContainText("-300 un")
  await expect(linha(page, "lançada em dobro").getByRole("button", { name: "Estornar" })).toHaveCount(0)

  await page.goto(`/estoque/${forminha.variacaoId}`)
  await expect(page.getByText("Saldo: 0 un")).toBeVisible()
})

test("estorno que deixaria o saldo negativo mostra a mensagem", async ({ page }) => {
  const forminha = await criarProdutoTeste({ nome: "Forminha" })
  await criarEstoqueTeste(forminha.variacaoId, { quantidade: 100, custo: 0.05, usuarioId: donaId })
  await movimentarTeste({ variacaoId: forminha.variacaoId, tipo: "perda_avaria", quantidade: -60, motivo: "molhou", usuarioId: donaId })
  await entrarComoAdministrador(page, DONA)
  await page.goto(`/estoque/movimentacoes?variacao=${forminha.variacaoId}`)

  await estornar(page, "Entrada manual", "nota errada")
  await expect(page.getByText("Saldo insuficiente: há 40 un neste lote.")).toBeVisible()
  await expect(linha(page, "Entrada manual")).not.toContainText("Estornada")
})

test("funcionária vê o extrato sem o botão Estornar", async ({ page }) => {
  await forminhaComEstoque()
  await entrarComoFuncionaria(page)
  await page.goto("/estoque/movimentacoes")
  await expect(linha(page, "Entrada manual")).toContainText("+2.000 un")
  await expect(page.getByRole("button", { name: "Estornar" })).toHaveCount(0)
})
