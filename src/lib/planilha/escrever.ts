import ExcelJS from "exceljs"

import { ABA_FORMAS, ABA_VARIACOES, COLUNAS_FORMAS, COLUNAS_VARIACOES } from "./colunas"
import type { LinhaForma, LinhaVariacao } from "./tipos"

// Colunas que parecem número mas são texto: o Excel não pode tirar o zero da frente nem usar notação científica.
const COMO_TEXTO = new Set(["Código interno", "Código de barras", "NCM"])
const simNao = (valor: boolean) => (valor ? "S" : "N")

function prepararAba(livro: ExcelJS.Workbook, nome: string, colunas: readonly string[]): ExcelJS.Worksheet {
  const folha = livro.addWorksheet(nome, { views: [{ state: "frozen", ySplit: 1 }] })
  folha.columns = colunas.map((coluna) => ({
    header: coluna,
    width: Math.max(12, coluna.length + 4),
    style: COMO_TEXTO.has(coluna) ? { numFmt: "@" } : {},
  }))
  folha.getRow(1).font = { bold: true }
  return folha
}

// O modelo do sistema: com as linhas do catálogo (exportação) ou vazio (só os cabeçalhos).
export async function escreverPlanilha(
  variacoes: Omit<LinhaVariacao, "linha">[],
  formas: Omit<LinhaForma, "linha">[],
): Promise<ArrayBuffer> {
  const livro = new ExcelJS.Workbook()

  const folhaVariacoes = prepararAba(livro, ABA_VARIACOES, COLUNAS_VARIACOES)
  for (const v of variacoes) {
    folhaVariacoes.addRow([
      v.produto,
      v.variacao,
      v.codigoInterno,
      v.codigoBarras,
      v.ncm,
      v.categorias.join("; "),
      v.materiais.join("; "),
      v.tipoVenda,
      simNao(v.controlaValidade),
      simNao(v.aptoForno),
      simNao(v.aptoFreezer),
      simNao(v.aptoMicroondas),
      simNao(v.aptoAlimento),
      v.estoqueMinimo,
      v.comprimentoMm,
      v.larguraMm,
      v.alturaMm,
      v.capacidadeMl,
    ])
  }

  const folhaFormas = prepararAba(livro, ABA_FORMAS, COLUNAS_FORMAS)
  folhaFormas.getColumn(COLUNAS_FORMAS.indexOf("Preço (R$)") + 1).numFmt = '"R$" #,##0.00'
  for (const f of formas) {
    folhaFormas.addRow([f.codigoInterno, f.forma, f.fator, f.quantidadeMinima, f.precoCentavos / 100])
  }

  return (await livro.xlsx.writeBuffer()) as ArrayBuffer
}
