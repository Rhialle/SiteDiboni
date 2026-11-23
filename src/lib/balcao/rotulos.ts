import type { FormaPagamento } from "./carrinho"

// Nomes das formas de pagamento na tela, na ordem do fechamento do caixa.
export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  pix: "Pix",
}

export const ROTULO_MOVIMENTO_CAIXA = { retirada: "Retirada", reforco: "Reforço" } as const
