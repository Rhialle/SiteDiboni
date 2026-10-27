import { reaisParaCentavos } from "@/lib/formatacao"

// Quantidades do estoque: sempre inteiras, na unidade base (un para produto por unidade, g para por peso).
// Nas telas, a pessoa digita na unidade que preferir e o fator converte.

export type TipoVenda = "unidade" | "peso"

export type UnidadeDeDigitacao = { valor: string; rotulo: string; fator: number; casas: 0 | 3 }

type Forma = { id: string; nome: string; fator: number; peso_variavel: boolean; ativa: boolean }

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })

// "3" × 100 = 300; "1,250" kg × 1000 = 1250 g. Ponto só como separador de milhar ("1.000").
// Devolve null se não for número, tiver casas demais ou não der inteiro maior que zero.
export function paraUnidadeBase(texto: string, fator: number, casas: 0 | 3): number | null {
  const partes = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/.exec(texto.trim())
  if (!partes) return null
  const decimais = partes[2] ?? ""
  if (decimais.length > casas) return null

  const escala = 10 ** casas
  const emFracoes = Number(partes[1].replace(/\./g, "") + decimais.padEnd(casas, "0"))
  const base = (emFracoes * fator) / escala
  return Number.isInteger(base) && base > 0 ? base : null
}

// Custo digitado pela unidade escolhida (ex.: R$ 12,00 a caixa com 100) em reais por unidade base.
export function custoUnitarioBase(texto: string, fator: number): string | null {
  try {
    return (reaisParaCentavos(texto) / 100 / fator).toFixed(6)
  } catch {
    return null
  }
}

export function unidadesDeDigitacao(tipoVenda: TipoVenda, formas: Forma[]): UnidadeDeDigitacao[] {
  if (tipoVenda === "peso") {
    return [
      { valor: "g", rotulo: "g", fator: 1, casas: 0 },
      { valor: "kg", rotulo: "kg", fator: 1000, casas: 3 },
    ]
  }
  return [
    { valor: "un", rotulo: "unidade(s)", fator: 1, casas: 0 },
    ...formas
      .filter((forma) => forma.ativa && !forma.peso_variavel && forma.fator > 1)
      .map((forma) => ({ valor: `forma:${forma.id}`, rotulo: forma.nome, fator: forma.fator, casas: 0 as const })),
  ]
}

export function formatarQuantidade(base: number, tipoVenda: TipoVenda): string {
  return `${inteiro.format(base)} ${tipoVenda === "peso" ? "g" : "un"}`
}
