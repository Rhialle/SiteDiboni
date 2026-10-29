import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import { montarPlanilha } from "./apoio/planilha"
import {
  criarFaixaTeste,
  criarFormaTeste,
  criarProdutoTeste,
  criarUsuarioTeste,
  limparCatalogo,
  limparUsuarios,
  restaurarConfiguracoes,
  variacaoPorCodigo,
  type DadosUsuarioTeste,
} from "./apoio/supabase"

const DONA: DadosUsuarioTeste = { email: "dona@loja.test", senha: "SenhaDona123", nome: "Dona", papel: "administrador" }
const FUNC: DadosUsuarioTeste = { email: "func@loja.test", senha: "SenhaFunc123", nome: "Func", papel: "funcionario" }

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  await restaurarConfiguracoes()
  await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

const textoNaTela = (page: Page, texto: string) => page.getByText(texto).filter({ visible: true })

async function abrirPlanilha(page: Page) {
  await page.goto("/produtos/planilha")
  await expect(page.getByRole("heading", { name: "Planilha do catálogo" })).toBeVisible()
}

async function conferir(page: Page, arquivo: string | { name: string; mimeType: string; buffer: Buffer }) {
  await campo(page, "Planilha (.xlsx)").setInputFiles(arquivo)
  await page.getByRole("button", { name: "Conferir planilha" }).click()
}

async function importarConfirmando(page: Page) {
  page.once("dialog", (dialogo) => dialogo.accept())
  await page.getByRole("button", { name: "Importar planilha" }).click()
}

const forma = (codigo: string, nome: string, fator: number, quantidade: number, preco: number | string) => ({
  "Código interno": codigo,
  Forma: nome,
  Fator: fator,
  "Quantidade mínima": quantidade,
  "Preço (R$)": preco,
})

test("exportar o catálogo e importar de volta sem mudar nada: tudo sem mudança", async ({ page }) => {
  const caixa = await criarProdutoTeste({
    nome: "Caixa para bolo",
    variacao: { nome: "P", codigo_interno: "CX-P", codigo_barras: "7891000000014" },
  })
  const pacote = await criarFormaTeste(caixa.variacaoId, { nome: "Pacote com 10", fator: 10, preco_centavos: 1500 })
  await criarFaixaTeste(pacote, 5, 1400)
  await criarProdutoTeste({ nome: "Tampa", variacao: { codigo_interno: "TP-1" } })

  await entrarComoAdministrador(page, DONA)
  await abrirPlanilha(page)
  const baixando = page.waitForEvent("download")
  await page.getByRole("link", { name: "Exportar catálogo" }).click()
  const download = await baixando
  expect(download.suggestedFilename()).toMatch(/^catalogo-\d{4}-\d{2}-\d{2}\.xlsx$/)

  await conferir(page, await download.path())
  await expect(textoNaTela(page, "0 criado(s), 0 atualizado(s) e 2 sem mudança.")).toBeVisible()
  await expect(textoNaTela(page, "Nada a importar: a planilha é igual ao catálogo.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Importar planilha" })).toHaveCount(0)
})

test("planilha nova cria produtos com variações, categorias, materiais e forma com faixa", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  await abrirPlanilha(page)
  const forminha = { Produto: "Forminha", NCM: "48239099", Categorias: "Confeitaria > Forminhas", Materiais: "Papel" }
  await conferir(
    page,
    await montarPlanilha(
      [
        { ...forminha, Variação: "N4", "Código interno": "FM-4" },
        { ...forminha, Variação: "N5", "Código interno": "FM-5" },
        { Produto: "Granulado", Variação: "Chocolate", "Código interno": "GR-1", "Tipo de venda": "peso", "Controla validade": "S" },
      ],
      [forma("FM-4", "Pacote com 100", 100, 1, 6), forma("FM-4", "Pacote com 100", 100, 10, "5,50"), forma("GR-1", "Granel", 1000, 1, 32)],
    ),
  )
  await expect(textoNaTela(page, "3 criado(s), 0 atualizado(s) e 0 sem mudança.")).toBeVisible()
  await importarConfirmando(page)
  await expect(textoNaTela(page, "Planilha importada: 3 criado(s) e 0 atualizado(s).")).toBeVisible()

  const n4 = await variacaoPorCodigo("FM-4")
  expect(n4?.produtos.nome).toBe("Forminha")
  expect((await variacaoPorCodigo("FM-5"))?.produtos.id).toBe(n4?.produtos.id)
  await page.goto(`/produtos/${n4!.produtos.id}`)
  const pacote = page.getByRole("group", { name: "Pacote com 100" }).filter({ visible: true }).first()
  await expect(pacote).toContainText("R$ 6,00")
  await expect(pacote).toContainText("a partir de 10: R$ 5,50")
})

test("erros aparecem por aba, linha e coluna, e nada é importado", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  await abrirPlanilha(page)
  await conferir(
    page,
    await montarPlanilha(
      [
        { Produto: "Forminha", Variação: "N4", "Código interno": "FM-4" },
        { Produto: "Forminha", Variação: "N5", "Código interno": "FM-5", NCM: "123" },
      ],
      [forma("FM-4", "Pacote com 100", 100, 1, "12.50")],
    ),
  )
  const erros = page.getByRole("table", { name: "Erros da planilha" })
  await expect(erros.getByRole("row").filter({ hasText: "NCM" }).getByRole("cell")).toHaveText([
    "Variações",
    "3",
    "NCM",
    "O NCM precisa ter 8 dígitos.",
  ])
  await expect(erros.getByRole("row").filter({ hasText: "Formas de venda" }).getByRole("cell")).toHaveText([
    "Formas de venda",
    "2",
    "Preço (R$)",
    "Informe o preço em reais, por exemplo 6,00.",
  ])
  await expect(page.getByRole("button", { name: "Importar planilha" })).toHaveCount(0)
  expect(await variacaoPorCodigo("FM-4")).toBeNull()
})

test("planilha atualiza: renomeia o produto, apaga o código de barras vazio e desativa a forma que sumiu", async ({ page }) => {
  const caixa = await criarProdutoTeste({
    nome: "Caixa para bolo",
    variacao: { nome: "P", codigo_interno: "CX-P", codigo_barras: "7891000000014" },
  })
  await criarFormaTeste(caixa.variacaoId, { nome: "Pacote com 10", fator: 10, preco_centavos: 1500 })
  await criarFormaTeste(caixa.variacaoId, { nome: "Unidade", fator: 1, preco_centavos: 200 })

  await entrarComoAdministrador(page, DONA)
  await abrirPlanilha(page)
  await conferir(
    page,
    await montarPlanilha(
      [{ Produto: "Caixa de bolo", Variação: "P", "Código interno": "CX-P", "Código de barras": "" }],
      [forma("CX-P", "Unidade", 1, 1, 2)],
    ),
  )
  await expect(textoNaTela(page, "0 criado(s), 1 atualizado(s) e 0 sem mudança.")).toBeVisible()
  await importarConfirmando(page)
  await expect(textoNaTela(page, "Planilha importada: 0 criado(s) e 1 atualizado(s).")).toBeVisible()

  const variacao = await variacaoPorCodigo("CX-P")
  expect(variacao?.produtos.nome).toBe("Caixa de bolo")
  expect(variacao?.codigo_barras).toBeNull()
  await page.goto(`/produtos/${caixa.produtoId}`)
  await expect(page.getByRole("group", { name: "Pacote com 10" }).filter({ visible: true }).first()).toContainText("(inativa)")
  await expect(page.getByRole("group", { name: "Unidade" }).filter({ visible: true }).first()).not.toContainText("(inativa)")
})

test("funcionária não vê a planilha nem baixa o catálogo", async ({ page }) => {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.goto("/produtos")
  await expect(page.getByRole("link", { name: "Planilha" })).toHaveCount(0)

  await page.goto("/produtos/planilha")
  await expect(page).toHaveURL(/\/sem-permissao/)
  const resposta = await page.request.get("/produtos/planilha/exportar")
  expect(resposta.headers()["content-type"] ?? "").not.toContain("spreadsheet")
})
