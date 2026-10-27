import { expect, test, type Page } from "@playwright/test"

import { alterarSaldoDireto, criarSolicitacaoTeste, rodarConferencia } from "./apoio/banco"
import { entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarEstoqueTeste,
  criarProdutoTeste,
  criarUsuarioTeste,
  dataDaqui,
  definirEstoqueMinimo,
  limparCatalogo,
  limparUsuarios,
  restaurarConfiguracoes,
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
  // O teste de Configurações muda os dias de alerta; aqui vale o padrão (30, 15 e 7).
  await restaurarConfiguracoes()
  donaId = await criarUsuarioTeste(DONA)
  funcId = await criarUsuarioTeste(FUNC)
})

const secao = (page: Page, titulo: string) => page.getByRole("region", { name: titulo })

// Granulado: 100 g vencendo em 5 dias e 50 g vencidos; estoque mínimo de 500 g.
async function granuladoComAlertas() {
  const granulado = await criarProdutoTeste({ nome: "Granulado", tipo_venda: "peso", controla_validade: true })
  await criarEstoqueTeste(granulado.variacaoId, {
    quantidade: 100, custo: 0.03, usuarioId: donaId, validade: dataDaqui(5), codigo: "V5",
  })
  await criarEstoqueTeste(granulado.variacaoId, {
    quantidade: 50, custo: 0.03, usuarioId: donaId, validade: dataDaqui(-1), codigo: "VELHO",
  })
  await definirEstoqueMinimo(granulado.variacaoId, 500)
  return granulado
}

const hoje = () => dataDaqui(0).split("-").reverse().join("/")

test("alertas: lote vencendo em 5 dias na faixa de 7, vencido com saldo e variação abaixo do mínimo", async ({ page }) => {
  await granuladoComAlertas()
  await entrarComoAdministrador(page, DONA)
  await page.getByRole("link", { name: "Alertas", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Alertas", level: 1 })).toBeVisible()

  await expect(secao(page, "Vencendo")).toContainText("V5")
  await expect(secao(page, "Vencendo")).toContainText("até 7 dias")
  await expect(secao(page, "Vencidos com saldo")).toContainText("VELHO")
  await expect(secao(page, "Vencidos com saldo")).not.toContainText("V5")
  await expect(secao(page, "Abaixo do estoque mínimo")).toContainText("Granulado")
  await expect(secao(page, "Abaixo do estoque mínimo")).toContainText("100 g")
  await expect(secao(page, "Abaixo do estoque mínimo")).toContainText("500 g")
})

test("Início mostra as contagens com links para os alertas; sem nada, 'Nenhum aviso.'", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  await expect(page.getByText("Nenhum aviso.")).toBeVisible()

  await granuladoComAlertas()
  await page.goto("/inicio")
  await expect(page.getByText("1 lote(s) vencem em até 30 dias")).toBeVisible()
  await expect(page.getByText("1 lote(s) vencidos com saldo")).toBeVisible()
  await expect(page.getByText("1 variação(ões) abaixo do estoque mínimo")).toBeVisible()
  await page.getByRole("link", { name: "1 lote(s) vencidos com saldo" }).click()
  await expect(page.getByRole("heading", { name: "Alertas", level: 1 })).toBeVisible()
})

test("administrador vê solicitações pendentes e a conferência com diferença; funcionária não vê a conferência", async ({ page }) => {
  const forminha = await criarProdutoTeste({ nome: "Forminha" })
  await criarEstoqueTeste(forminha.variacaoId, { quantidade: 100, custo: 0.05, usuarioId: donaId })
  await criarSolicitacaoTeste({ variacaoId: forminha.variacaoId, quantidade: -90, motivo: "molhou", solicitadoPor: funcId })
  await alterarSaldoDireto(forminha.variacaoId, 1)
  await rodarConferencia()

  await entrarComoAdministrador(page, DONA)
  await expect(page.getByText("1 solicitação(ões) pendente(s)")).toBeVisible()
  await expect(
    page.getByText(`A conferência de ${hoje()} achou 1 diferença(s) entre saldo e movimentações.`),
  ).toBeVisible()

  await page.getByRole("button", { name: "Sair" }).click()
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.goto("/inicio")
  await expect(page.getByText("1 solicitação(ões) pendente(s)")).toBeVisible()
  await expect(page.getByText(/A conferência/)).toHaveCount(0)
})
