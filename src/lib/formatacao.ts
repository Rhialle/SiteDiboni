const FUSO = "America/Sao_Paulo"

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO })

export function formatarMoeda(centavos: number): string {
  return moeda.format(centavos / 100)
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
