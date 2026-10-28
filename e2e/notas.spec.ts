import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
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
