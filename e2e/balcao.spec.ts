import { expect, test, type Page } from "@playwright/test"

import { abrirCaixaTeste, codigoDeBarrasDaFormaTeste, limparEstoque } from "./apoio/banco"
import { campo, entrar } from "./apoio/navegador"
import {
  criarEstoqueTeste,
  criarFaixaTeste,
  criarFormaTeste,
  criarProdutoTeste,
  criarUsuarioTeste,
  dataDaqui,
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
const linhas = (page: Page, nome: string) => page.getByRole("group", { name: nome })
const total = (page: Page) => page.getByLabel("Total da venda")

// Forminha N4: Unidade (R$ 0,20) e "Pacote com 100" (R$ 15,00; a partir de 3, R$ 13,50), com código
// da unidade e do pacote, e 1.000 un no estoque.
async function forminha() {
  const { variacaoId } = await criarProdutoTeste({
    nome: "Forminha",
    variacao: { nome: "N4", codigo_interno: "FM-1", codigo_barras: "7891000000014" },
  })
  await criarFormaTeste(variacaoId, { nome: "Unidade", fator: 1, preco_centavos: 20 })
  const pacote = await criarFormaTeste(variacaoId, { nome: "Pacote com 100", fator: 100, preco_centavos: 1500 })
  await criarFaixaTeste(pacote, 3, 1350)
  await codigoDeBarrasDaFormaTeste(pacote, "7891000000021")
  await criarEstoqueTeste(variacaoId, { quantidade: 1000, custo: 0.05, usuarioId: donaId })
  return variacaoId
}

async function entrarNoBalcao(page: Page) {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.goto("/balcao")
  await expect(campo(page, "Código ou nome")).toBeVisible()
}

async function bipar(page: Page, codigo: string) {
  await campo(page, "Código ou nome").fill(codigo)
  await campo(page, "Código ou nome").press("Enter")
}

test("sem caixa aberto, o balcão pede para abrir o caixa", async ({ page }) => {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.goto("/balcao")
  await expect(page.getByRole("heading", { name: "Abrir caixa" })).toBeVisible()
})

test("bipar a unidade soma na mesma linha; bipar o pacote abre outra linha", async ({ page }) => {
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "7891000000014")
  await expect(linhas(page, "Forminha – N4")).toHaveCount(1)
  await bipar(page, "7891000000014")
  await expect(linhas(page, "Forminha – N4").first().getByLabel("Quantidade")).toHaveValue("2")
  await bipar(page, "7891000000021")
  await expect(linhas(page, "Forminha – N4")).toHaveCount(2)
  await expect(linhas(page, "Forminha – N4").nth(1).getByLabel("Forma")).toHaveValue(/.+/)
  await expect(total(page)).toHaveText("R$ 15,40")
})

test("busca pelo nome mostra a lista; o granel pede os gramas", async ({ page }) => {
  await forminha()
  const { variacaoId } = await criarProdutoTeste({ nome: "Granulado", tipo_venda: "peso", controla_validade: true, variacao: { nome: "Chocolate" } })
  await criarFormaTeste(variacaoId, { nome: "Granel", fator: 1000, preco_centavos: 4000, peso_variavel: true })
  await criarEstoqueTeste(variacaoId, { quantidade: 5000, custo: 0.03, usuarioId: donaId, validade: dataDaqui(60), codigo: "L-B" })
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "granulado")
  await page.getByRole("list", { name: "Resultados da busca" }).getByRole("button", { name: /Granulado – Chocolate/ }).click()
  const granel = linhas(page, "Granulado – Chocolate")
  await granel.getByLabel("Gramas").fill("350")
  await expect(total(page)).toHaveText("R$ 14,00")
})

test("3 pacotes com a faixa, pagos em dinheiro com troco, e o comprovante", async ({ page }) => {
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "7891000000021")
  await linhas(page, "Forminha – N4").getByLabel("Quantidade").fill("3")
  await expect(total(page)).toHaveText("R$ 40,50")
  await page.getByRole("button", { name: "Receber (F2)" }).click()
  const pagamento = page.getByRole("region", { name: "Pagamento" })
  await pagamento.getByLabel("Recebido").fill("50,00")
  await expect(pagamento).toContainText("Troco R$ 9,50")
  await pagamento.getByRole("button", { name: "Concluir venda" }).click()
  const concluida = page.getByRole("status", { name: "Venda concluída" })
  await expect(concluida).toContainText(/Venda nº 1$|Venda nº 1\D/)
  await expect(concluida).toContainText("Troco R$ 9,50")
  await expect(textoNaTela(page, "Nenhum item na venda.")).toBeVisible()

  await page.goto("/vendas/1/comprovante")
  const comprovante = page.getByRole("article", { name: "Comprovante" })
  await expect(comprovante).toContainText("Não é documento fiscal")
  await expect(comprovante).toContainText("Forminha – N4")
  await expect(comprovante).toContainText("Troco")
})

test("venda dividida em Pix e dinheiro", async ({ page }) => {
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "7891000000021")
  await linhas(page, "Forminha – N4").getByLabel("Quantidade").fill("3")
  await page.keyboard.press("F2")
  const pagamento = page.getByRole("region", { name: "Pagamento" })
  await pagamento.getByLabel("Forma de pagamento").first().selectOption("pix")
  await pagamento.getByLabel("Valor").first().fill("20,00")
  await pagamento.getByRole("button", { name: "Dividir o pagamento" }).click()
  await pagamento.getByLabel("Forma de pagamento").nth(1).selectOption("dinheiro")
  await pagamento.getByRole("button", { name: "Concluir venda" }).click()
  await expect(page.getByRole("status", { name: "Venda concluída" })).toContainText(/Venda nº 1$|Venda nº 1\D/)
})

test("desconto acima de 10% pela funcionária mostra o limite e não deixa receber", async ({ page }) => {
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "7891000000021")
  await linhas(page, "Forminha – N4").getByLabel("Quantidade").fill("3")
  await page.getByLabel("Em").selectOption("percentual")
  await page.getByLabel("Desconto").fill("11")
  await expect(textoNaTela(page, "Desconto acima de 10%: só o administrador pode dar.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Receber (F2)" })).toBeDisabled()
})

test("venda sem saldo avisa na linha e conclui", async ({ page }) => {
  const { variacaoId } = await criarProdutoTeste({ nome: "Tampa", variacao: { codigo_interno: "TP-1" } })
  await criarFormaTeste(variacaoId, { nome: "Unidade", fator: 1, preco_centavos: 50 })
  await criarEstoqueTeste(variacaoId, { quantidade: 2, custo: 0.1, usuarioId: donaId })
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "TP-1")
  await linhas(page, "Tampa – Padrão").getByLabel("Quantidade").fill("5")
  await expect(linhas(page, "Tampa – Padrão")).toContainText("Sem saldo no sistema")
  await page.getByRole("button", { name: "Receber (F2)" }).click()
  await page.getByRole("region", { name: "Pagamento" }).getByRole("button", { name: "Concluir venda" }).click()
  await expect(page.getByRole("status", { name: "Venda concluída" })).toContainText(/Venda nº 1$|Venda nº 1\D/)
})

test("produto só com estoque vencido avisa e pede para conferir a validade", async ({ page }) => {
  const { variacaoId } = await criarProdutoTeste({ nome: "Pote", controla_validade: true, variacao: { codigo_interno: "PT-1" } })
  await criarFormaTeste(variacaoId, { nome: "Unidade", fator: 1, preco_centavos: 300 })
  await criarEstoqueTeste(variacaoId, { quantidade: 5, custo: 1, usuarioId: donaId, validade: dataDaqui(-1), codigo: "VELHO" })
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "PT-1")
  const pote = linhas(page, "Pote – Padrão")
  await expect(pote).toContainText("O estoque deste produto no sistema está vencido. Confira a validade na embalagem.")
  await expect(page.getByRole("button", { name: "Receber (F2)" })).toBeDisabled()
  await pote.getByRole("checkbox").check()
  await expect(page.getByRole("button", { name: "Receber (F2)" })).toBeEnabled()
})

test("a venda em andamento volta depois de recarregar e some depois de concluir", async ({ page }) => {
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "7891000000014")
  await expect(linhas(page, "Forminha – N4")).toHaveCount(1)
  await page.reload()
  await expect(linhas(page, "Forminha – N4")).toHaveCount(1)
  await page.getByRole("button", { name: "Receber (F2)" }).click()
  await page.getByRole("region", { name: "Pagamento" }).getByRole("button", { name: "Concluir venda" }).click()
  await expect(page.getByRole("status", { name: "Venda concluída" })).toBeVisible()
  await page.reload()
  await expect(textoNaTela(page, "Nenhum item na venda.")).toBeVisible()
})

test("código que não existe sai do campo, e duas bipadas seguidas entram as duas", async ({ page }) => {
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "7890000000000")
  await expect(textoNaTela(page, "Nenhum produto à venda com este código ou nome.")).toBeVisible()
  await expect(campo(page, "Código ou nome")).toHaveValue("")
  await bipar(page, "7891000000014")
  await bipar(page, "7891000000014")
  await expect(linhas(page, "Forminha – N4").getByLabel("Quantidade")).toHaveValue("2")
})

test("o desconto da venda anterior não fica no campo", async ({ page }) => {
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await bipar(page, "7891000000021")
  await expect(linhas(page, "Forminha – N4")).toHaveCount(1)
  await page.getByLabel("Desconto").fill("1,00")
  await expect(total(page)).toHaveText("R$ 14,00")
  await page.getByRole("button", { name: "Receber (F2)" }).click()
  await page.getByRole("region", { name: "Pagamento" }).getByRole("button", { name: "Concluir venda" }).click()
  await expect(page.getByRole("status", { name: "Venda concluída" })).toBeVisible()
  await expect(page.getByLabel("Desconto")).toHaveValue("")
})

test("o botão Câmera abre a câmera e Fechar desliga", async ({ page }) => {
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await page.getByRole("button", { name: "Câmera" }).click()
  const janela = page.getByRole("dialog", { name: "Ler código de barras" })
  await expect(janela.locator("video")).toBeVisible()
  await janela.getByRole("button", { name: "Fechar" }).click()
  await expect(janela).toHaveCount(0)
  await expect(page.locator("video")).toHaveCount(0)
})

test("com a câmera bloqueada, aparece como liberar", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("negado", "NotAllowedError"))
  })
  await forminha()
  await abrirCaixaTeste(funcId)
  await entrarNoBalcao(page)
  await page.getByRole("button", { name: "Câmera" }).click()
  await expect(page.getByRole("dialog", { name: "Ler código de barras" })).toContainText(
    "Libere a câmera nas configurações do navegador para ler o código.",
  )
})

