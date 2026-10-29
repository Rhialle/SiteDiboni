// Planilhas .xlsx montadas nos testes, com as colunas do modelo do sistema.
import ExcelJS from "exceljs"

import { COLUNAS_FORMAS, COLUNAS_VARIACOES } from "../../src/lib/planilha/colunas"

type Celulas = Partial<Record<string, string | number | null>>

const PADRAO_VARIACAO: Celulas = {
  "Tipo de venda": "unidade",
  "Controla validade": "N",
  Forno: "N",
  Freezer: "N",
  "Micro-ondas": "N",
  Alimento: "N",
}

export async function montarPlanilha(variacoes: Celulas[], formas: Celulas[] = []) {
  const livro = new ExcelJS.Workbook()
  const abaVariacoes = livro.addWorksheet("Variações")
  abaVariacoes.addRow([...COLUNAS_VARIACOES])
  for (const linha of variacoes) {
    const celulas = { ...PADRAO_VARIACAO, ...linha }
    abaVariacoes.addRow(COLUNAS_VARIACOES.map((coluna) => celulas[coluna] ?? null))
  }
  const abaFormas = livro.addWorksheet("Formas de venda")
  abaFormas.addRow([...COLUNAS_FORMAS])
  for (const linha of formas) abaFormas.addRow(COLUNAS_FORMAS.map((coluna) => linha[coluna] ?? null))
  return {
    name: "catalogo.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await livro.xlsx.writeBuffer()),
  }
}
