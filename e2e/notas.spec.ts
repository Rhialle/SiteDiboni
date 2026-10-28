import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  codigoInternoDe,
  criarProdutoTeste,
  criarUsuarioTeste,
  dataDaqui,
  definirCnpjLoja,
  limparCatalogo,
  limparUsuarios,
  modeloXml,
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

// O destinatário das notas de exemplo (src/lib/notas/modelos/LEIAME.md).
const CNPJ_DA_LOJA = "11222333000181"

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  await restaurarConfiguracoes()
  await definirCnpjLoja(CNPJ_DA_LOJA)
  await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

const linha = (page: Page, texto: string) => page.getByRole("row").filter({ hasText: texto })
const arquivo = (nome: string, conteudo: string) => ({ name: nome, mimeType: "text/xml", buffer: Buffer.from(conteudo) })

async function entrarComoFuncionaria(page: Page) {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
}

async function importar(page: Page, arquivos: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.goto("/notas")
  await campo(page, "Arquivos XML").setInputFiles(arquivos)
  await page.getByRole("button", { name: "Importar notas" }).click()
}

const resultado = (page: Page, nomeDoArquivo: string) =>
  page.getByRole("list", { name: "Resultado da importação" }).getByRole("listitem").filter({ hasText: nomeDoArquivo })

test("funcionária importa uma nota nova: aparece em Aguardando administrador com o fornecedor", async ({ page }) => {
  await entrarComoFuncionaria(page)
  await importar(page, [arquivo("nota-com-lote.xml", modeloXml("nota-com-lote.xml"))])

  await expect(resultado(page, "nota-com-lote.xml")).toContainText(
    "Nota 456 de Embalagens Exemplo Ltda: importada, aguardando o administrador ligar 3 item(ns).",
  )
  await page.goto("/notas")
  await expect(linha(page, "Embalagens Exemplo Ltda")).toContainText("456")
  await expect(linha(page, "Embalagens Exemplo Ltda")).toContainText("Aguardando administrador")
  await expect(linha(page, "Embalagens Exemplo Ltda")).toContainText("Func")
})

test("arquivos misturados: o bom entra; inválido, outro CNPJ e sem autorização mostram cada um a sua mensagem", async ({ page }) => {
  const simples = modeloXml("nota-simples.xml")
  await entrarComoAdministrador(page, DONA)
  await importar(page, [
    arquivo("boa.xml", simples),
    arquivo("lixo.xml", "isto não é uma nota"),
    arquivo("outro-cnpj.xml", modeloXml("nota-com-lote.xml").replace(`<CNPJ>${CNPJ_DA_LOJA}</CNPJ>`, "<CNPJ>04252011000110</CNPJ>")),
    arquivo("sem-autorizacao.xml", simples.replace("<cStat>100</cStat>", "<cStat>110</cStat>")),
  ])

  await expect(resultado(page, "boa.xml")).toContainText("Nota 123 de Doces Exemplo Ltda: importada")
  await expect(resultado(page, "lixo.xml")).toContainText("Arquivo inválido: não é o XML de uma NF-e.")
  await expect(resultado(page, "outro-cnpj.xml")).toContainText("Esta nota não é para a loja: o destinatário é outro CNPJ.")
  await expect(resultado(page, "sem-autorizacao.xml")).toContainText("Nota sem autorização da SEFAZ.")
  await page.goto("/notas")
  await expect(page.getByRole("row").filter({ hasText: "Doces Exemplo Ltda" })).toHaveCount(1)
  await expect(page.getByRole("row").filter({ hasText: "Embalagens Exemplo Ltda" })).toHaveCount(0)
})

test("a mesma nota de novo mostra quando e por quem foi importada", async ({ page }) => {
  await entrarComoFuncionaria(page)
  await importar(page, [arquivo("nota-simples.xml", modeloXml("nota-simples.xml"))])
  await expect(resultado(page, "nota-simples.xml")).toContainText("importada")

  await importar(page, [arquivo("de-novo.xml", modeloXml("nota-simples.xml"))])
  const hoje = dataDaqui(0).split("-").reverse().join("/")
  await expect(resultado(page, "de-novo.xml")).toContainText(`Esta nota já foi importada em ${hoje} por Func.`)
})

test("sem o CNPJ da loja em Configurações, a importação mostra a mensagem", async ({ page }) => {
  await definirCnpjLoja(null)
  await entrarComoAdministrador(page, DONA)
  await importar(page, [arquivo("nota-simples.xml", modeloXml("nota-simples.xml"))])
  await expect(resultado(page, "nota-simples.xml")).toContainText(
    "Informe o CNPJ da loja em Configurações antes de importar notas.",
  )
})

test("lista filtra por situação", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  await importar(page, [arquivo("nota-com-lote.xml", modeloXml("nota-com-lote.xml"))])
  await expect(resultado(page, "nota-com-lote.xml")).toContainText("importada")

  await page.goto("/notas")
  await campo(page, "Situação").selectOption({ label: "Confirmada" })
  await page.getByRole("button", { name: "Filtrar" }).click()
  await expect(page.getByText("Nenhuma nota.").filter({ visible: true })).toBeVisible()

  await campo(page, "Situação").selectOption({ label: "Aguardando administrador" })
  await page.getByRole("button", { name: "Filtrar" }).click()
  await expect(linha(page, "Embalagens Exemplo Ltda")).toBeVisible()
})

// --- Revisão da nota e ligação dos itens (Task 7) ---

const GOMA = "GOMA DE MASCAR MENTA 12X25G"
const FORMINHA = "FORMINHA N4 MARROM CX C/1000"
const GRANULADO = "GRANULADO CHOCOLATE GRANEL"

async function abrirNota(page: Page, nomeDoArquivo: string) {
  await resultado(page, nomeDoArquivo).getByRole("link", { name: "Abrir a nota" }).click()
  await expect(page.getByRole("heading", { name: /^Nota \d+/ })).toBeVisible()
}

const linhaDoItem = (page: Page, descricao: string) =>
  page.getByRole("table", { name: "Itens da nota" }).getByRole("row").filter({ hasText: descricao })
const itemParaLigar = (page: Page, numero: number, descricao: string) =>
  page.getByRole("region", { name: `Item ${numero}: ${descricao}` })
const situacaoNaTela = (page: Page, texto: string) => page.getByText(texto, { exact: true }).filter({ visible: true })

async function ligarPorCodigo(page: Page, numero: number, descricao: string, fator: string, codigo?: string) {
  const formulario = itemParaLigar(page, numero, descricao).getByRole("form", { name: "Ligar a uma variação" })
  if (codigo !== undefined) await formulario.getByLabel("Código interno ou de barras").fill(codigo)
  await formulario.getByLabel("Fator").fill(fator)
  await formulario.getByRole("button", { name: "Ligar" }).click()
}

test("administrador liga um item pela sugestão do código de barras e informa o fator; a nota passa a Em revisão", async ({ page }) => {
  await criarProdutoTeste({ nome: "Goma Teste", variacao: { codigo_barras: "7891000000014" } })
  await entrarComoAdministrador(page, DONA)
  await importar(page, [arquivo("nota-simples.xml", modeloXml("nota-simples.xml"))])
  await abrirNota(page, "nota-simples.xml")
  await expect(situacaoNaTela(page, "Aguardando administrador")).toBeVisible()

  // A sugestão: a variação com o mesmo código de barras do XML.
  const formulario = itemParaLigar(page, 1, GOMA).getByRole("form", { name: "Ligar a uma variação" })
  await expect(formulario.getByLabel("Código interno ou de barras")).toHaveValue("7891000000014")
  await ligarPorCodigo(page, 1, GOMA, "12")

  await expect(linhaDoItem(page, GOMA)).toContainText("Goma Teste")
  await expect(linhaDoItem(page, GOMA)).toContainText("1 DP = 12 un")
  // 2 DP × 12 = 24 un; custo 94,50 (90,00 + IPI 4,50) ÷ 24 = 3,9375.
  await expect(linhaDoItem(page, GOMA)).toContainText("R$\u00a094,50")
  await expect(linhaDoItem(page, GOMA)).toContainText("R$\u00a03,9375")
  await expect(situacaoNaTela(page, "Em revisão")).toBeVisible()
  await expect(itemParaLigar(page, 1, GOMA)).toHaveCount(0)
})

test("administrador cria o produto a partir do item, escolhendo tipo e validade, e o item fica ligado", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  await importar(page, [arquivo("nota-com-lote.xml", modeloXml("nota-com-lote.xml"))])
  await abrirNota(page, "nota-com-lote.xml")

  const formulario = itemParaLigar(page, 2, GRANULADO).getByRole("form", { name: "Criar produto a partir do item" })
  // Já vem com o que estava no XML.
  await expect(formulario.getByLabel("Nome")).toHaveValue(GRANULADO)
  await expect(formulario.getByLabel("NCM")).toHaveValue("18069000")
  await expect(formulario.getByLabel("Código de barras")).toHaveValue("7891000000021")
  await formulario.getByLabel("Nome").fill("Granulado de chocolate")
  await formulario.getByLabel("Tipo de venda").selectOption({ label: "Por peso (a granel)" })
  await formulario.getByLabel("Controla validade (lote)").check()
  await formulario.getByLabel("Fator").fill("1000")
  await formulario.getByRole("button", { name: "Criar produto e ligar" }).click()

  await expect(linhaDoItem(page, GRANULADO)).toContainText("Granulado de chocolate")
  await expect(linhaDoItem(page, GRANULADO)).toContainText("1 KG = 1.000 g")
  await expect(itemParaLigar(page, 2, GRANULADO)).toHaveCount(0)
  // Os outros dois itens continuam sem ligação.
  await expect(situacaoNaTela(page, "Aguardando administrador")).toBeVisible()
})

test("fator que não dá inteiro mostra a mensagem com o item", async ({ page }) => {
  const { variacaoId } = await criarProdutoTeste({ nome: "Forminha Teste" })
  const codigo = await codigoInternoDe(variacaoId)
  await entrarComoAdministrador(page, DONA)
  await importar(page, [arquivo("nota-com-lote.xml", modeloXml("nota-com-lote.xml"))])
  await abrirNota(page, "nota-com-lote.xml")

  await ligarPorCodigo(page, 1, FORMINHA, "3", codigo)
  await expect(itemParaLigar(page, 1, FORMINHA)).toContainText(
    `Item 1 (${FORMINHA}): 2,5 CX × 3 não dá quantidade inteira. Confira o fator.`,
  )
  await expect(linhaDoItem(page, FORMINHA)).toContainText("Sem ligação")
  await expect(linhaDoItem(page, FORMINHA)).not.toContainText("Forminha Teste")
})

test("na segunda nota do mesmo fornecedor o item já vem ligado", async ({ page }) => {
  await criarProdutoTeste({ nome: "Goma Teste", variacao: { codigo_barras: "7891000000014" } })
  await entrarComoAdministrador(page, DONA)
  const primeira = modeloXml("nota-simples.xml")
  await importar(page, [arquivo("primeira.xml", primeira)])
  await abrirNota(page, "primeira.xml")
  await ligarPorCodigo(page, 1, GOMA, "12")
  await expect(linhaDoItem(page, GOMA)).toContainText("1 DP = 12 un")

  // Outra nota do mesmo fornecedor: outra chave e outro número, o mesmo item.
  const segunda = primeira
    .replaceAll("0000001231000001239", "0000001241000001248")
    .replace("<nNF>123</nNF>", "<nNF>124</nNF>")
  await importar(page, [arquivo("segunda.xml", segunda)])
  await expect(resultado(page, "segunda.xml")).toContainText("Nota 124 de Doces Exemplo Ltda: importada, pronta para revisar.")
  await abrirNota(page, "segunda.xml")
  await expect(linhaDoItem(page, GOMA)).toContainText("Goma Teste")
  await expect(linhaDoItem(page, GOMA)).toContainText("1 DP = 12 un")
  await expect(situacaoNaTela(page, "Em revisão")).toBeVisible()
})

test("funcionária vê a nota sem valores e sem os botões de ligar", async ({ page }) => {
  await entrarComoFuncionaria(page)
  await importar(page, [arquivo("nota-com-lote.xml", modeloXml("nota-com-lote.xml"))])
  await abrirNota(page, "nota-com-lote.xml")

  await expect(linhaDoItem(page, FORMINHA)).toBeVisible()
  await expect(page.getByText("Aguardando o administrador ligar este item").filter({ visible: true })).toHaveCount(3)
  await expect(page.getByRole("columnheader", { name: "Custo total" })).toHaveCount(0)
  await expect(page.getByText(/R\$/).filter({ visible: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Ligar" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Criar produto e ligar" })).toHaveCount(0)
})
