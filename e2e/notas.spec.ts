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

// --- Recebimento, lotes, confirmação e descarte (Task 8) ---

const TAMPA = "TAMPA PARA POTE 250ML"

// Importa a nota com lote e liga os três itens: Forminha (1 CX = 1.000 un), Granulado por peso com
// validade (1 KG = 1.000 g, lotes L1 e L2 do XML) e Tampa (1 UN = 1 un). A nota fica Em revisão.
async function prepararNotaComLoteLigada(page: Page, xml = modeloXml("nota-com-lote.xml")) {
  const forminha = await criarProdutoTeste({ nome: "Forminha Teste" })
  const granulado = await criarProdutoTeste({ nome: "Granulado Teste", tipo_venda: "peso", controla_validade: true })
  const tampa = await criarProdutoTeste({ nome: "Tampa Teste" })
  await entrarComoAdministrador(page, DONA)
  await importar(page, [arquivo("nota-com-lote.xml", xml)])
  await abrirNota(page, "nota-com-lote.xml")
  await ligarPorCodigo(page, 1, FORMINHA, "1000", await codigoInternoDe(forminha.variacaoId))
  await expect(linhaDoItem(page, FORMINHA)).toContainText("1 CX = 1.000 un")
  await ligarPorCodigo(page, 2, GRANULADO, "1000", await codigoInternoDe(granulado.variacaoId))
  await expect(linhaDoItem(page, GRANULADO)).toContainText("1 KG = 1.000 g")
  await ligarPorCodigo(page, 3, TAMPA, "1", await codigoInternoDe(tampa.variacaoId))
  await expect(situacaoNaTela(page, "Em revisão")).toBeVisible()
  return { forminha, granulado, tampa }
}

const recebimento = (page: Page, numero: number) => page.getByRole("form", { name: `Recebimento do item ${numero}` })
const mensagemNaTela = (page: Page, texto: string) => page.getByText(texto).filter({ visible: true })

async function clicarConfirmando(page: Page, botao: string) {
  page.once("dialog", (dialogo) => dialogo.accept())
  await page.getByRole("button", { name: botao }).click()
}

test("importar, revisar e confirmar: o saldo da Forminha e os lotes do Granulado aparecem no estoque", async ({ page }) => {
  const { granulado } = await prepararNotaComLoteLigada(page)

  // O recebimento já vem com a quantidade da nota e os lotes do XML, na unidade da nota.
  await expect(recebimento(page, 1).getByLabel("Recebido")).toHaveValue("2,5")
  await expect(recebimento(page, 2).getByLabel("Recebido")).toHaveValue("2")
  await expect(recebimento(page, 2).getByLabel("Lote 1: código")).toHaveValue("L1")
  await expect(recebimento(page, 2).getByLabel("Lote 1: validade")).toHaveValue("2027-03-10")
  await expect(recebimento(page, 2).getByLabel("Lote 1: quantidade")).toHaveValue("1,5")
  await expect(recebimento(page, 2).getByLabel("Lote 2: quantidade")).toHaveValue("0,5")

  await clicarConfirmando(page, "Confirmar nota")
  await expect(mensagemNaTela(page, "Nota confirmada: o estoque foi atualizado.")).toBeVisible()
  await expect(situacaoNaTela(page, "Confirmada")).toBeVisible()
  await expect(page.getByRole("button", { name: "Confirmar nota" })).toHaveCount(0)

  await linhaDoItem(page, FORMINHA).getByRole("link", { name: "Ver estoque" }).click()
  await expect(page.getByRole("heading", { name: "Forminha Teste" })).toBeVisible()
  await expect(mensagemNaTela(page, "Saldo: 2.500 un")).toBeVisible()

  await page.goto(`/estoque/${granulado.variacaoId}`)
  const lotes = page.getByRole("table", { name: "Lotes" })
  await expect(lotes.getByRole("row").filter({ hasText: "L1" })).toContainText("10/03/2027")
  await expect(lotes.getByRole("row").filter({ hasText: "L1" })).toContainText("1.500 g")
  await expect(lotes.getByRole("row").filter({ hasText: "L2" })).toContainText("22/05/2027")
  await expect(lotes.getByRole("row").filter({ hasText: "L2" })).toContainText("500 g")
})

test("recebido menor que a nota: entra no estoque só o que chegou", async ({ page }) => {
  const { tampa } = await prepararNotaComLoteLigada(page)
  await recebimento(page, 3).getByLabel("Recebido").fill("8")
  await recebimento(page, 3).getByRole("button", { name: "Salvar recebimento" }).click()
  await expect(recebimento(page, 3).getByText("Recebimento salvo.")).toBeVisible()
  await expect(recebimento(page, 3).getByLabel("Recebido")).toHaveValue("8")

  await clicarConfirmando(page, "Confirmar nota")
  await expect(situacaoNaTela(page, "Confirmada")).toBeVisible()
  await page.goto(`/estoque/${tampa.variacaoId}`)
  await expect(mensagemNaTela(page, "Saldo: 8 un")).toBeVisible()
})

test("lotes que não somam a quantidade recebida: a confirmação mostra a mensagem e nada entra no estoque", async ({ page }) => {
  // No XML, o lote L2 veio com 0,4 kg: os lotes somam 1,9 kg e a nota diz 2 kg.
  const xml = modeloXml("nota-com-lote.xml").replace("<qLote>0.500</qLote>", "<qLote>0.400</qLote>")
  const { forminha } = await prepararNotaComLoteLigada(page, xml)

  await clicarConfirmando(page, "Confirmar nota")
  await expect(
    mensagemNaTela(page, `Item 2 (${GRANULADO}): a soma dos lotes (1900) precisa ser igual à quantidade recebida (2000).`),
  ).toBeVisible()
  await expect(situacaoNaTela(page, "Em revisão")).toBeVisible()
  await page.goto(`/estoque/${forminha.variacaoId}`)
  await expect(mensagemNaTela(page, "Saldo: 0 un")).toBeVisible()
})

test("descartar a nota em revisão: some da lista de pendentes e a mesma chave pode ser importada de novo", async ({ page }) => {
  await criarProdutoTeste({ nome: "Goma Teste", variacao: { codigo_barras: "7891000000014" } })
  await entrarComoAdministrador(page, DONA)
  await importar(page, [arquivo("nota-simples.xml", modeloXml("nota-simples.xml"))])
  await abrirNota(page, "nota-simples.xml")
  await ligarPorCodigo(page, 1, GOMA, "12")
  await expect(situacaoNaTela(page, "Em revisão")).toBeVisible()

  await clicarConfirmando(page, "Descartar nota")
  await expect(mensagemNaTela(page, "Nota descartada.")).toBeVisible()
  await expect(situacaoNaTela(page, "Descartada")).toBeVisible()

  await page.goto("/notas?situacao=em_revisao")
  await expect(mensagemNaTela(page, "Nenhuma nota.")).toBeVisible()
  await importar(page, [arquivo("de-novo.xml", modeloXml("nota-simples.xml"))])
  await expect(resultado(page, "de-novo.xml")).toContainText("Nota 123 de Doces Exemplo Ltda: importada, pronta para revisar.")
})

// --- Divergências, busca pelo fornecedor e aviso no Início (Task 9) ---

test("divergências listam fornecedor, nota, item e a diferença", async ({ page }) => {
  await prepararNotaComLoteLigada(page)
  await recebimento(page, 3).getByLabel("Recebido").fill("8")
  await recebimento(page, 3).getByRole("button", { name: "Salvar recebimento" }).click()
  await expect(recebimento(page, 3).getByText("Recebimento salvo.")).toBeVisible()
  await clicarConfirmando(page, "Confirmar nota")
  await expect(situacaoNaTela(page, "Confirmada")).toBeVisible()

  await page.goto("/notas")
  await page.getByRole("link", { name: "Divergências" }).click()
  const divergencias = page.getByRole("table", { name: "Divergências" })
  const tampa = divergencias.getByRole("row").filter({ hasText: "Tampa Teste" })
  await expect(tampa).toContainText("Embalagens Exemplo Ltda")
  await expect(tampa).toContainText("456")
  await expect(tampa).toContainText("10 un")
  await expect(tampa).toContainText("8 un")
  await expect(tampa).toContainText("-2 un")
  // O que chegou certo não aparece.
  await expect(divergencias.getByRole("row").filter({ hasText: "Forminha Teste" })).toHaveCount(0)
})

test("a lista de produtos acha pelo nome do fornecedor", async ({ page }) => {
  await criarProdutoTeste({ nome: "Goma Teste", variacao: { codigo_barras: "7891000000014" } })
  await criarProdutoTeste({ nome: "Outro Produto" })
  await entrarComoAdministrador(page, DONA)
  await importar(page, [arquivo("nota-simples.xml", modeloXml("nota-simples.xml"))])
  await abrirNota(page, "nota-simples.xml")
  await ligarPorCodigo(page, 1, GOMA, "12")
  await expect(linhaDoItem(page, GOMA)).toContainText("1 DP = 12 un")

  await page.goto("/produtos")
  await expect(campo(page, "Buscar")).toHaveAttribute("placeholder", "Nome, fornecedor, código interno ou de barras")
  await campo(page, "Buscar").fill("doces exemplo")
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(linha(page, "Goma Teste")).toBeVisible()
  await expect(linha(page, "Outro Produto")).toHaveCount(0)
})

test("Início mostra '1 nota(s) aguardando o administrador' com link para a lista", async ({ page }) => {
  await entrarComoFuncionaria(page)
  await importar(page, [arquivo("nota-com-lote.xml", modeloXml("nota-com-lote.xml"))])
  await expect(resultado(page, "nota-com-lote.xml")).toContainText("importada")
  await page.getByRole("button", { name: "Sair" }).click()

  await entrarComoAdministrador(page, DONA)
  await expect(page.getByText("1 nota(s) aguardando o administrador")).toBeVisible()
  await page.getByRole("link", { name: "1 nota(s) aguardando o administrador" }).click()
  await expect(page).toHaveURL(/\/notas\?situacao=aguardando_administrador/)
  await expect(linha(page, "Embalagens Exemplo Ltda")).toBeVisible()
})
