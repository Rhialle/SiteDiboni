const FUSO = "America/Sao_Paulo"

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO })
const reais = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const custo = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

export function formatarMoeda(centavos: number): string {
  return moeda.format(centavos / 100)
}

// Para campos de formulário: "1.234,56", sem o "R$".
export function formatarReais(centavos: number): string {
  return reais.format(centavos / 100)
}

// Custo por unidade base (numeric com 6 casas no banco): "0.012500" → "R$ 0,0125".
export function formatarCusto(valor: string | number): string {
  return custo.format(Number(valor))
}

export function formatarData(valor: Date | string): string {
  return data.format(typeof valor === "string" ? new Date(valor) : valor)
}

// Aceita "50", "50,5", "50,00", "1.234,56" e "R$ 1.234,56"; recusa negativos.
export function reaisParaCentavos(texto: string): number {
  const limpo = texto.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "")
  const partes = /^(\d+)(?:,(\d{1,2}))?$/.exec(limpo)
  if (!partes) throw new Error("Valor inválido")
  const [, inteiros, decimais = ""] = partes
  return Number(inteiros) * 100 + Number(decimais.padEnd(2, "0"))
}
