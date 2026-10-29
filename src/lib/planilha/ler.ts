import ExcelJS from "exceljs"

import { MENSAGENS, mensagemSemAba, mensagemSemColuna } from "@/lib/mensagens"

import {
  lerCategorias,
  lerCodigoBarras,
  lerEstoqueMinimo,
  lerInteiroPositivo,
  lerMateriais,
  lerNcm,
  lerPreco,
  lerSimNao,
  lerTexto,
  lerTipoVenda,
  textoDaCelula,
  type Lido,
} from "./celulas"
import { ABA_FORMAS, ABA_VARIACOES, COLUNAS_FORMAS, COLUNAS_VARIACOES, MAXIMO_LINHAS } from "./colunas"
import type { Aba, ErroDaPlanilha, LinhaForma, LinhaVariacao, PlanilhaLida } from "./tipos"

const normalizar = (texto: string) => texto.trim().replace(/\s+/g, " ").toLowerCase()

// Uma linha de dados: lê cada coluna pelo nome e junta os erros com a linha e a coluna do Excel.
type Leitor = { valor: <T>(coluna: string, ler: (celula: unknown) => Lido<T>) => T | undefined; erros: ErroDaPlanilha[] }

function leitorDaLinha(aba: Aba, linha: ExcelJS.Row, colunas: Map<string, number>): Leitor {
  const erros: ErroDaPlanilha[] = []
  return {
    erros,
    valor(coluna, ler) {
      const lido = ler(linha.getCell(colunas.get(coluna)!).value)
      if (lido.ok) return lido.valor
      erros.push({ aba, linha: linha.number, coluna, mensagem: lido.erro })
      return undefined
    },
  }
}

const codigoInterno = (celula: unknown): Lido<string> => {
  const lido = lerTexto(celula, { obrigatorio: true, maximo: 30 })
  return lido.ok ? { ok: true, valor: lido.valor.toUpperCase() } : lido
}

function lerVariacao(l: Leitor, numero: number): LinhaVariacao | null {
  const variacao: LinhaVariacao = {
    linha: numero,
    produto: l.valor("Produto", (c) => lerTexto(c, { obrigatorio: true, maximo: 160 }))!,
    variacao: l.valor("Variação", (c) => lerTexto(c, { obrigatorio: false, maximo: 120 })) || "Padrão",
    codigoInterno: l.valor("Código interno", codigoInterno)!,
    codigoBarras: l.valor("Código de barras", lerCodigoBarras)!,
    ncm: l.valor("NCM", lerNcm)!,
    categorias: l.valor("Categorias", lerCategorias)!,
    materiais: l.valor("Materiais", lerMateriais)!,
    tipoVenda: l.valor("Tipo de venda", lerTipoVenda)!,
    controlaValidade: l.valor("Controla validade", lerSimNao)!,
    aptoForno: l.valor("Forno", lerSimNao)!,
    aptoFreezer: l.valor("Freezer", lerSimNao)!,
    aptoMicroondas: l.valor("Micro-ondas", lerSimNao)!,
    aptoAlimento: l.valor("Alimento", lerSimNao)!,
    estoqueMinimo: l.valor("Estoque mínimo (un ou g)", lerEstoqueMinimo)!,
    comprimentoMm: l.valor("Comprimento (mm)", (c) => lerInteiroPositivo(c, false))!,
    larguraMm: l.valor("Largura (mm)", (c) => lerInteiroPositivo(c, false))!,
    alturaMm: l.valor("Altura (mm)", (c) => lerInteiroPositivo(c, false))!,
    capacidadeMl: l.valor("Capacidade (ml)", (c) => lerInteiroPositivo(c, false))!,
  }
  return l.erros.length ? null : variacao
}

function lerForma(l: Leitor, numero: number): LinhaForma | null {
  const forma: LinhaForma = {
    linha: numero,
    codigoInterno: l.valor("Código interno", codigoInterno)!,
    forma: l.valor("Forma", (c) => lerTexto(c, { obrigatorio: true, maximo: 60 }))!,
    fator: l.valor("Fator", (c) => lerInteiroPositivo(c, true))!,
    quantidadeMinima: l.valor("Quantidade mínima", (c) => lerInteiroPositivo(c, true))!,
    precoCentavos: l.valor("Preço (R$)", lerPreco)!,
  }
  return l.erros.length ? null : forma
}

// Lê as linhas de uma aba (a primeira linha é o cabeçalho). Linhas totalmente vazias ficam de fora.
function lerAba<T>(
  folha: ExcelJS.Worksheet,
  aba: Aba,
  nomes: readonly string[],
  lerLinha: (leitor: Leitor, numero: number) => T | null,
): { linhas: T[]; erros: ErroDaPlanilha[] } {
  const cabecalho = new Map<string, number>()
  folha.getRow(1).eachCell((celula, coluna) => cabecalho.set(normalizar(textoDaCelula(celula.value)), coluna))
  const colunas = new Map<string, number>()
  const erros: ErroDaPlanilha[] = []
  for (const nome of nomes) {
    const coluna = cabecalho.get(normalizar(nome))
    if (coluna === undefined) erros.push({ aba, linha: null, coluna: nome, mensagem: mensagemSemColuna(aba, nome) })
    else colunas.set(nome, coluna)
  }
  if (erros.length) return { linhas: [], erros }

  const dados: ExcelJS.Row[] = []
  for (let numero = 2; numero <= folha.rowCount; numero++) {
    const linha = folha.getRow(numero)
    if ([...colunas.values()].some((coluna) => textoDaCelula(linha.getCell(coluna).value) !== "")) dados.push(linha)
  }
  if (dados.length > MAXIMO_LINHAS) {
    return { linhas: [], erros: [{ aba, linha: null, coluna: null, mensagem: MENSAGENS.planilhaLinhasDemais }] }
  }

  const linhas: T[] = []
  for (const linha of dados) {
    const leitor = leitorDaLinha(aba, linha, colunas)
    const lida = lerLinha(leitor, linha.number)
    if (lida) linhas.push(lida)
    erros.push(...leitor.erros)
  }
  return { linhas, erros }
}

export async function lerPlanilha(arquivo: ArrayBuffer): Promise<PlanilhaLida> {
  const livro = new ExcelJS.Workbook()
  try {
    await livro.xlsx.load(Buffer.from(arquivo) as unknown as ExcelJS.Buffer)
  } catch {
    return { variacoes: [], formas: [], erros: [{ aba: null, linha: null, coluna: null, mensagem: MENSAGENS.planilhaInvalida }] }
  }

  const folha = (aba: Aba) => livro.worksheets.find((f) => normalizar(f.name) === normalizar(aba))
  const folhaVariacoes = folha(ABA_VARIACOES)
  const folhaFormas = folha(ABA_FORMAS)
  const faltando = [ABA_VARIACOES, ABA_FORMAS].filter((aba) => !folha(aba))
  if (!folhaVariacoes || !folhaFormas) {
    return {
      variacoes: [],
      formas: [],
      erros: faltando.map((aba) => ({ aba: null, linha: null, coluna: null, mensagem: mensagemSemAba(aba) })),
    }
  }

  const variacoes = lerAba(folhaVariacoes, ABA_VARIACOES, COLUNAS_VARIACOES, lerVariacao)
  const formas = lerAba(folhaFormas, ABA_FORMAS, COLUNAS_FORMAS, lerForma)
  return { variacoes: variacoes.linhas, formas: formas.linhas, erros: [...variacoes.erros, ...formas.erros] }
}
