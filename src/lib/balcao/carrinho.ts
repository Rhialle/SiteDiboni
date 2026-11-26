// A venda em andamento no balcão: linhas, subtotal, desconto e troco, em centavos inteiros.
// As contas são as mesmas do banco (registrar_venda recalcula e recusa se o total não bater).

import { precoPorPeso, precoTotal, type FormaComFaixas } from "@/lib/catalogo/preco"

export type FormaDaLinha = FormaComFaixas & { nome: string; fator: number; pesoVariavel: boolean }

export type LinhaDoCarrinho = {
  formaVendaId: string
  variacaoId: string
  nome: string
  forma: FormaDaLinha
  // Em formas de venda; no granel, em gramas.
  quantidade: number
  // Validade impressa na embalagem, para a venda sem saldo de produto com validade sem lote válido.
  validadeSemSaldo: string | null
}

// O que o cliente devolve na troca (fase 2.4). Validade impressa na embalagem, para o produto com
// validade sem lote válido.
export type LinhaDevolvida = {
  formaVendaId: string
  variacaoId: string
  nome: string
  forma: FormaDaLinha
  // Em formas de venda; no granel, em gramas.
  quantidade: number
  validade: string | null
}

export type Desconto = { tipo: "reais" | "percentual"; valor: number }

export type FormaPagamento = "dinheiro" | "cartao_credito" | "cartao_debito" | "pix"

export type Pagamento = { forma: FormaPagamento; valorCentavos: number; recebidoCentavos: number | null }

// Bipar de novo a mesma forma soma na mesma linha; outra forma da mesma variação é outra linha.
export function adicionar(linhas: LinhaDoCarrinho[], nova: LinhaDoCarrinho): LinhaDoCarrinho[] {
  const existente = linhas.find((l) => l.formaVendaId === nova.formaVendaId)
  if (!existente) return [...linhas, nova]
  return linhas.map((l) => (l === existente ? { ...l, quantidade: l.quantidade + nova.quantidade } : l))
}

export function totalDaLinha(linha: LinhaDoCarrinho): number {
  return linha.forma.pesoVariavel
    ? precoPorPeso(linha.forma.preco_centavos, linha.quantidade)
    : precoTotal(linha.forma, linha.quantidade)
}

export function subtotal(linhas: LinhaDoCarrinho[]): number {
  return linhas.reduce((soma, linha) => soma + totalDaLinha(linha), 0)
}

// O devolvido vale o preço de 1 forma × a quantidade, sem a faixa (a etiqueta mostra o preço de 1);
// no granel, pelo preço do kg. A mesma conta de preco_da_devolucao no banco.
export function valorDevolvido(linha: LinhaDevolvida): number {
  return linha.forma.pesoVariavel
    ? precoPorPeso(linha.forma.preco_centavos, linha.quantidade)
    : linha.forma.preco_centavos * linha.quantidade
}

export function totalDevolvido(linhas: LinhaDevolvida[]): number {
  return linhas.reduce((soma, linha) => soma + valorDevolvido(linha), 0)
}

// Percentual arredondado ao centavo (meio para cima); nunca mais que o subtotal.
export function descontoEmCentavos(subtotalCentavos: number, desconto: Desconto): number {
  const valor =
    desconto.tipo === "percentual" ? Math.round((subtotalCentavos * desconto.valor) / 100) : Math.round(desconto.valor)
  return Math.min(Math.max(valor, 0), subtotalCentavos)
}

export function troco(valorCentavos: number, recebidoCentavos: number): number {
  return Math.max(recebidoCentavos - valorCentavos, 0)
}

// Os parâmetros de registrar_venda.
export function paraEnvio(
  linhas: LinhaDoCarrinho[],
  descontoCentavos: number,
  pagamentos: Pagamento[],
  devolvidos: LinhaDevolvida[] = [],
) {
  return {
    p_itens: linhas.map((l) => ({
      forma_venda_id: l.formaVendaId,
      quantidade: l.quantidade,
      validade_sem_saldo: l.validadeSemSaldo,
    })),
    p_desconto_centavos: descontoCentavos,
    p_pagamentos: pagamentos.map((p) => ({
      forma: p.forma,
      valor_centavos: p.valorCentavos,
      recebido_centavos: p.recebidoCentavos,
    })),
    p_total_centavos: subtotal(linhas) - descontoCentavos,
    p_devolvidos: devolvidos.map((d) => ({ forma_venda_id: d.formaVendaId, quantidade: d.quantidade, validade: d.validade })),
    p_devolvido_centavos: totalDevolvido(devolvidos),
  }
}
