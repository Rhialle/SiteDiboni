import { expect, test, type Page } from "@playwright/test"

import { abrirCaixaTeste, limparEstoque, muitasEntradasTeste, trocaTeste, venderTeste } from "./apoio/banco"
import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarEstoqueTeste,
  criarFormaTeste,
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
let funcId = ""

test.beforeEach(async () => {
  await limparEstoque()
  await limparUsuarios()
  await limparCatalogo()
  await restaurarConfiguracoes()
  donaId = await criarUsuarioTeste(DONA)
  funcId = await criarUsuarioTeste(FUNC)
})

const textoNaTela = (page: Page, texto: string) => page.getByText(texto).filter({ visible: true })

async function tampa(estoque: number) {
  const { variacaoId } = await criarProdutoTeste({ nome: "Tampa", variacao: { codigo_interno: "TP-1" } })
  const formaId = await criarFormaTeste(variacaoId, { nome: "Unidade", fator: 1, preco_centavos: 50 })
  if (estoque > 0) await criarEstoqueTeste(variacaoId, { quantidade: estoque, custo: 0.1, usuarioId: donaId })
  return { variacaoId, formaId }
}

test("a venda aparece na lista e no detalhe; só o administrador vê o custo e cancela", async ({ page }) => {
  const { variacaoId, formaId } = await tampa(10)
  await abrirCaixaTeste(funcId)
  await venderTeste(funcId, formaId, 2, 100)

  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.goto("/vendas")
  const linha = page.getByRole("table", { name: "Vendas" }).getByRole("row").nth(1)
  await expect(linha).toContainText("R$ 1,00")
  await expect(linha).toContainText("Pix")
  await page.goto("/vendas/1")
  await expect(page.getByRole("heading", { name: "Venda nº 1" })).toBeVisible()
  await expect(page.getByRole("table", { name: "Itens" })).toContainText("Tampa – Padrão")
  await expect(page.getByRole("table", { name: "Movimentações da venda" })).toContainText("Venda")
  await expect(page.getByRole("columnheader", { name: "Custo" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Cancelar venda" })).toHaveCount(0)

  await page.context().clearCookies()
  await entrarComoAdministrador(page, DONA)
  await page.goto("/vendas/1")
  await expect(page.getByRole("columnheader", { name: "Custo" })).toBeVisible()
  await campo(page, "Motivo do cancelamento").fill("cliente desistiu")
  page.once("dialog", (dialogo) => dialogo.accept())
  await page.getByRole("button", { name: "Cancelar venda" }).click()
  // Cancelada, o formulário dá lugar à data e ao motivo (a tela recarrega).
  await expect(textoNaTela(page, "Cancelada em")).toContainText("cliente desistiu")
  await page.goto(`/estoque/${variacaoId}`)
  await expect(textoNaTela(page, "Saldo: 10 un")).toBeVisible()
})

test("venda sem saldo: aviso no Início e o administrador confere", async ({ page }) => {
  const { formaId } = await tampa(0)
  await abrirCaixaTeste(funcId)
  await venderTeste(funcId, formaId, 3, 150)

  await entrarComoAdministrador(page, DONA)
  await expect(textoNaTela(page, "venda(s) sem saldo a conferir")).toBeVisible()
  await page.goto("/vendas/sem-saldo")
  const linha = page.getByRole("table", { name: "Vendas sem saldo" }).getByRole("row").nth(1)
  await expect(linha).toContainText("Tampa – Padrão")
  await expect(linha).toContainText("3 un")
  await linha.getByRole("button", { name: "Marcar como conferido" }).click()
  await expect(textoNaTela(page, "Nenhuma venda sem saldo para conferir.")).toBeVisible()
})

test("Configurações guarda o limite de desconto e a largura do cupom", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  await page.goto("/configuracoes")
  await campo(page, "Limite de desconto da funcionária (%)").fill("15")
  await page.getByRole("radio", { name: "58 mm" }).check()
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByRole("status")).toBeVisible()
  await page.reload()
  await expect(campo(page, "Limite de desconto da funcionária (%)")).toHaveValue("15")
  await expect(page.getByRole("radio", { name: "58 mm" })).toBeChecked()
})

test("o custo aparece no detalhe da venda mesmo com mais de 1.000 custos guardados na loja", async ({ page }) => {
  const { variacaoId, formaId } = await tampa(10)
  await muitasEntradasTeste(variacaoId, donaId, 1001)
  await abrirCaixaTeste(funcId)
  await venderTeste(funcId, formaId, 2, 100)
  await entrarComoAdministrador(page, DONA)
  await page.goto("/vendas/1")
  const saida = page.getByRole("table", { name: "Movimentações da venda" }).getByRole("row").filter({ hasText: "Venda" })
  await expect(saida).toContainText("R$")
  await expect(saida).not.toContainText("sem custo")
})


// Troca (fase 2.4): Forminha N4 em "Pacote com 100" (R$ 15,00); devolve 1, leva 2, paga R$ 15,00.
async function trocaDeForminha() {
  const { variacaoId } = await criarProdutoTeste({ nome: "Forminha", variacao: { nome: "N4", codigo_interno: "FM-1" } })
  const pacote = await criarFormaTeste(variacaoId, { nome: "Pacote com 100", fator: 100, preco_centavos: 1500 })
  await criarEstoqueTeste(variacaoId, { quantidade: 1000, custo: 0.05, usuarioId: donaId })
  await abrirCaixaTeste(funcId)
  await trocaTeste(funcId, {
    leva: { formaId: pacote, quantidade: 2 },
    devolve: { formaId: pacote, quantidade: 1 },
    totalCentavos: 3000,
    devolvidoCentavos: 1500,
  })
}

test("a troca aparece com o selo Troca e o valor pago; o detalhe e o comprovante mostram o devolvido", async ({ page }) => {
  await trocaDeForminha()
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.goto("/vendas")
  const linha = page.getByRole("table", { name: "Vendas" }).getByRole("row").nth(1)
  await expect(linha).toContainText("Troca")
  await expect(linha).toContainText("R$ 15,00")
  await expect(textoNaTela(page, "R$ 15,00 sem as canceladas")).toBeVisible()

  await page.goto("/vendas/1")
  const devolvido = page.getByRole("table", { name: "Devolvido" })
  await expect(devolvido).toContainText("Forminha – N4")
  await expect(devolvido).toContainText("Pacote com 100")
  await expect(devolvido).toContainText("R$ 15,00")
  const resumo = page.getByRole("group", { name: "Resumo da venda" })
  await expect(resumo).toContainText("TrocaR$ 15,00")
  await expect(resumo).toContainText("DinheiroR$ 15,00")

  await page.goto("/vendas/1/comprovante")
  const comprovante = page.getByRole("article", { name: "Comprovante" })
  await expect(comprovante).toContainText("Devolvido")
  await expect(comprovante).toContainText("Forminha – N4")
  await expect(comprovante).toContainText("Troca")
})
