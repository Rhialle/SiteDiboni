import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"

import { COLUNAS_FORMAS, COLUNAS_VARIACOES } from "./colunas"
import { escreverPlanilha } from "./escrever"
import { lerPlanilha } from "./ler"
import type { LinhaForma, LinhaVariacao } from "./tipos"

const CAIXA_P: Omit<LinhaVariacao, "linha"> = {
  produto: "Caixa para bolo",
  variacao: "P",
  codigoInterno: "CX-P",
  codigoBarras: "7891000000014",
  ncm: "04021010",
  categorias: ["Bolos > Caixas", "Festa"],
  materiais: ["Papel"],
  tipoVenda: "unidade",
  controlaValidade: false,
  aptoForno: false,
  aptoFreezer: true,
  aptoMicroondas: false,
  aptoAlimento: true,
  estoqueMinimo: 20,
  comprimentoMm: 150,
  larguraMm: 150,
  alturaMm: 80,
  capacidadeMl: null,
}
const CAIXA_G: Omit<LinhaVariacao, "linha"> = {
  ...CAIXA_P,
  variacao: "G",
  codigoInterno: "CX-G",
  codigoBarras: null,
  estoqueMinimo: 0,
  comprimentoMm: null,
  larguraMm: null,
  alturaMm: null,
}
const FORMAS: Omit<LinhaForma, "linha">[] = [
  { codigoInterno: "CX-P", forma: "Pacote com 10", fator: 10, quantidadeMinima: 1, precoCentavos: 1500 },
  { codigoInterno: "CX-P", forma: "Pacote com 10", fator: 10, quantidadeMinima: 5, precoCentavos: 1400 },
  { codigoInterno: "CX-G", forma: "Unidade", fator: 1, quantidadeMinima: 1, precoCentavos: 250 },
]

type Linha = (string | number | null)[]

// Monta um .xlsx à mão, para os casos que o modelo do sistema não gera.
async function planilha(abas: { nome: string; cabecalho: string[]; linhas: Linha[] }[]): Promise<ArrayBuffer> {
  const livro = new ExcelJS.Workbook()
  for (const aba of abas) {
    const folha = livro.addWorksheet(aba.nome)
    folha.addRow(aba.cabecalho)
    for (const linha of aba.linhas) folha.addRow(linha)
  }
  return (await livro.xlsx.writeBuffer()) as ArrayBuffer
}

// Uma linha da aba Variações com os valores do modelo, trocando o que for preciso.
function linhaVariacao(trocas: Partial<Record<string, string | number | null>> = {}): Linha {
  const padrao: Record<string, string | number | null> = {
    Produto: "Caixa para bolo",
    Variação: "P",
    "Código interno": "CX-P",
    "Código de barras": "",
    NCM: "48191000",
    Categorias: "",
    Materiais: "",
    "Tipo de venda": "unidade",
    "Controla validade": "N",
    Forno: "N",
    Freezer: "N",
    "Micro-ondas": "N",
    Alimento: "N",
    "Estoque mínimo (un ou g)": "",
    "Comprimento (mm)": "",
    "Largura (mm)": "",
    "Altura (mm)": "",
    "Capacidade (ml)": "",
  }
  return COLUNAS_VARIACOES.map((coluna) => (coluna in trocas ? (trocas[coluna] ?? null) : padrao[coluna]))
}

const abaFormas = { nome: "Formas de venda", cabecalho: [...COLUNAS_FORMAS], linhas: [] as Linha[] }

describe("escreverPlanilha e lerPlanilha", () => {
  it("ida e volta: o que foi escrito volta igual, sem erros, com a linha do Excel", async () => {
    const lida = await lerPlanilha(await escreverPlanilha([CAIXA_P, CAIXA_G], FORMAS))
    expect(lida.erros).toEqual([])
    expect(lida.variacoes).toEqual([
      { ...CAIXA_P, linha: 2 },
      { ...CAIXA_G, linha: 3 },
    ])
    expect(lida.formas).toEqual(FORMAS.map((forma, i) => ({ ...forma, linha: i + 2 })))
  })

  it("o modelo vazio tem só os cabeçalhos", async () => {
    const lida = await lerPlanilha(await escreverPlanilha([], []))
    expect(lida).toEqual({ variacoes: [], formas: [], erros: [] })
  })
})

describe("lerPlanilha", () => {
  it("sem a aba Formas de venda", async () => {
    const arquivo = await planilha([{ nome: "Variações", cabecalho: [...COLUNAS_VARIACOES], linhas: [] }])
    expect((await lerPlanilha(arquivo)).erros).toEqual([
      { aba: null, linha: null, coluna: null, mensagem: "A planilha não tem a aba “Formas de venda”." },
    ])
  })

  it("sem a coluna NCM", async () => {
    const cabecalho = COLUNAS_VARIACOES.filter((coluna) => coluna !== "NCM")
    const arquivo = await planilha([{ nome: "Variações", cabecalho, linhas: [] }, abaFormas])
    expect((await lerPlanilha(arquivo)).erros).toEqual([
      { aba: "Variações", linha: null, coluna: "NCM", mensagem: "A aba “Variações” não tem a coluna “NCM”." },
    ])
  })

  it("lê as colunas pelo nome, fora de ordem e sem diferença de maiúsculas, e ignora linhas vazias", async () => {
    const cabecalho = [...COLUNAS_VARIACOES].reverse().map((coluna) => coluna.toLowerCase())
    const arquivo = await planilha([
      { nome: "Variações", cabecalho, linhas: [[...linhaVariacao()].reverse(), [], [...linhaVariacao({ "Código interno": "cx-g " })].reverse()] },
      abaFormas,
    ])
    const lida = await lerPlanilha(arquivo)
    expect(lida.erros).toEqual([])
    expect(lida.variacoes.map((v) => [v.linha, v.codigoInterno])).toEqual([
      [2, "CX-P"],
      [4, "CX-G"],
    ])
  })

  it("mostra a aba, a linha do Excel e a coluna do erro, e deixa a linha de fora", async () => {
    const arquivo = await planilha([
      {
        nome: "Variações",
        cabecalho: [...COLUNAS_VARIACOES],
        linhas: [linhaVariacao(), linhaVariacao({ "Código interno": "CX-G" }), linhaVariacao({ "Código interno": "CX-M", NCM: "123" })],
      },
      abaFormas,
    ])
    const lida = await lerPlanilha(arquivo)
    expect(lida.erros).toEqual([{ aba: "Variações", linha: 4, coluna: "NCM", mensagem: "O NCM precisa ter 8 dígitos." }])
    expect(lida.variacoes.map((v) => v.codigoInterno)).toEqual(["CX-P", "CX-G"])
  })

  it("mais de 5.000 linhas numa aba", async () => {
    const linhas = Array.from({ length: 5001 }, (_, i) => linhaVariacao({ "Código interno": `C${i}` }))
    const arquivo = await planilha([{ nome: "Variações", cabecalho: [...COLUNAS_VARIACOES], linhas }, abaFormas])
    expect((await lerPlanilha(arquivo)).erros).toEqual([
      { aba: "Variações", linha: null, coluna: null, mensagem: "Cada aba pode ter até 5.000 linhas." },
    ])
  })

  it("arquivo que não é .xlsx", async () => {
    const arquivo = new TextEncoder().encode("isto não é uma planilha").buffer as ArrayBuffer
    expect(await lerPlanilha(arquivo)).toEqual({
      variacoes: [],
      formas: [],
      erros: [
        { aba: null, linha: null, coluna: null, mensagem: "Arquivo inválido: use uma planilha .xlsx (o modelo baixado do sistema)." },
      ],
    })
  })
})
