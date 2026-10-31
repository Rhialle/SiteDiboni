// Preço de venda (seção 11 da especificação): faixas por quantidade e granel pelo preço do kg.
// As contas são em centavos inteiros; a venda das fases 2 e 3 usa estas funções.

export type FormaComFaixas = {
  preco_centavos: number
  faixas: { quantidade_minima: number; preco_centavos: number }[]
}

// O preço de cada forma: o da maior faixa que a quantidade alcança, ou o preço normal.
export function precoUnitario(forma: FormaComFaixas, quantidade: number): number {
  const faixa = forma.faixas
    .filter((f) => quantidade >= f.quantidade_minima)
    .sort((a, b) => b.quantidade_minima - a.quantidade_minima)[0]
  return faixa ? faixa.preco_centavos : forma.preco_centavos
}

export function precoTotal(forma: FormaComFaixas, quantidade: number): number {
  return quantidade * precoUnitario(forma, quantidade)
}

// Preço do kg × gramas ÷ 1000, arredondado ao centavo com meio para cima (em inteiros, sem erro de vírgula).
export function precoPorPeso(precoKgCentavos: number, gramas: number): number {
  return Math.floor((precoKgCentavos * gramas + 500) / 1000)
}
