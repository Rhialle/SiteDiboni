import { describe, expect, it } from "vitest"

import { mensagemFaltaParaTroca } from "@/lib/mensagens"

import {
  adicionar,
  descontoEmCentavos,
  paraEnvio,
  subtotal,
  totalDaLinha,
  totalDevolvido,
  troco,
  valorDevolvido,
  type LinhaDevolvida,
  type LinhaDoCarrinho,
} from "./carrinho"

const PACOTE: LinhaDoCarrinho = {
  formaVendaId: "f-pacote",
  variacaoId: "v-forminha",
  nome: "Forminha – N4",
  forma: { nome: "Pacote com 100", fator: 100, pesoVariavel: false, preco_centavos: 1500, faixas: [{ quantidade_minima: 3, preco_centavos: 1350 }] },
  quantidade: 1,
  validadeSemSaldo: null,
}
const UNIDADE: LinhaDoCarrinho = {
  ...PACOTE,
  formaVendaId: "f-unidade",
  forma: { nome: "Unidade", fator: 1, pesoVariavel: false, preco_centavos: 20, faixas: [] },
}
const GRANEL: LinhaDoCarrinho = {
  formaVendaId: "f-granel",
  variacaoId: "v-granulado",
  nome: "Granulado – Chocolate",
  forma: { nome: "Granel", fator: 1000, pesoVariavel: true, preco_centavos: 4000, faixas: [] },
  quantidade: 350,
  validadeSemSaldo: null,
}

describe("totalDaLinha", () => {
  it("3 pacotes com faixa a partir de 3 saem a R$ 13,50 cada", () => {
    expect(totalDaLinha({ ...PACOTE, quantidade: 3 })).toBe(4050)
  })

  it("abaixo da faixa usa o preço normal", () => {
    expect(totalDaLinha({ ...PACOTE, quantidade: 2 })).toBe(3000)
  })

  it("granel: 350 g a R$ 40,00 o kg dá R$ 14,00", () => {
    expect(totalDaLinha(GRANEL)).toBe(1400)
  })
})

describe("adicionar", () => {
  it("bipar duas vezes a mesma forma soma na mesma linha", () => {
    expect(adicionar(adicionar([], PACOTE), PACOTE)).toEqual([{ ...PACOTE, quantidade: 2 }])
  })

  it("a mesma variação em outra forma vira outra linha", () => {
    expect(adicionar([PACOTE], UNIDADE)).toEqual([PACOTE, UNIDADE])
  })
})

describe("subtotal e desconto", () => {
  it("soma as linhas", () => {
    expect(subtotal([{ ...PACOTE, quantidade: 3 }, GRANEL])).toBe(5450)
  })

  it("10% de R$ 40,50 é R$ 4,05", () => {
    expect(descontoEmCentavos(4050, { tipo: "percentual", valor: 10 })).toBe(405)
  })

  it("percentual arredonda ao centavo, meio para cima", () => {
    expect(descontoEmCentavos(1000, { tipo: "percentual", valor: 33.333 })).toBe(333)
    expect(descontoEmCentavos(5, { tipo: "percentual", valor: 10 })).toBe(1)
  })

  it("desconto em reais nunca passa do subtotal", () => {
    expect(descontoEmCentavos(4050, { tipo: "reais", valor: 5000 })).toBe(4050)
    expect(descontoEmCentavos(4050, { tipo: "reais", valor: 500 })).toBe(500)
  })
})

describe("troco", () => {
  it("R$ 50,00 para R$ 40,50 dá R$ 9,50", () => {
    expect(troco(4050, 5000)).toBe(950)
  })

  it("recebido menor que o valor não tem troco", () => {
    expect(troco(4050, 4000)).toBe(0)
  })
})

describe("paraEnvio", () => {
  it("monta o carrinho no formato de registrar_venda", () => {
    expect(
      paraEnvio([{ ...PACOTE, quantidade: 3 }], 405, [
        { forma: "pix", valorCentavos: 2000, recebidoCentavos: null },
        { forma: "dinheiro", valorCentavos: 1645, recebidoCentavos: 2000 },
      ]),
    ).toEqual({
      p_itens: [{ forma_venda_id: "f-pacote", quantidade: 3, validade_sem_saldo: null }],
      p_desconto_centavos: 405,
      p_pagamentos: [
        { forma: "pix", valor_centavos: 2000, recebido_centavos: null },
        { forma: "dinheiro", valor_centavos: 1645, recebido_centavos: 2000 },
      ],
      p_total_centavos: 3645,
      p_devolvidos: [],
      p_devolvido_centavos: 0,
    })
  })
})

// Troca (fase 2.4): o devolvido vale o preço de 1 forma × a quantidade, sem a faixa.
const DEVOLVIDO: LinhaDevolvida = {
  formaVendaId: "f-pacote",
  variacaoId: "v-forminha",
  nome: "Forminha – N4",
  forma: PACOTE.forma,
  quantidade: 1,
  validade: null,
}

describe("valorDevolvido", () => {
  it("3 pacotes devolvidos valem R$ 45,00, sem a faixa", () => {
    expect(valorDevolvido({ ...DEVOLVIDO, quantidade: 3 })).toBe(4500)
  })

  it("granel pelo preço do kg: 250 g a R$ 40,00/kg valem R$ 10,00", () => {
    expect(valorDevolvido({ ...DEVOLVIDO, forma: GRANEL.forma, quantidade: 250 })).toBe(1000)
  })

  it("1 g a R$ 40,00/kg vale R$ 0,04", () => {
    expect(valorDevolvido({ ...DEVOLVIDO, forma: GRANEL.forma, quantidade: 1 })).toBe(4)
  })

  it("totalDevolvido soma as linhas", () => {
    expect(totalDevolvido([DEVOLVIDO, { ...DEVOLVIDO, forma: GRANEL.forma, quantidade: 250 }])).toBe(2500)
  })
})

describe("paraEnvio com troca", () => {
  it("envia o devolvido e o valor dele", () => {
    const envio = paraEnvio([{ ...PACOTE, quantidade: 2 }], 0, [{ forma: "dinheiro", valorCentavos: 1500, recebidoCentavos: null }], [
      DEVOLVIDO,
    ])
    expect(envio.p_devolvidos).toEqual([{ forma_venda_id: "f-pacote", quantidade: 1, validade: null }])
    expect(envio.p_devolvido_centavos).toBe(1500)
    expect(envio.p_total_centavos).toBe(3000)
  })

  it("sem devolvido, envia a lista vazia e zero", () => {
    const envio = paraEnvio([PACOTE], 0, [])
    expect(envio.p_devolvidos).toEqual([])
    expect(envio.p_devolvido_centavos).toBe(0)
  })
})

describe("mensagemFaltaParaTroca", () => {
  it("diz quanto falta para fechar a troca", () => {
    expect(mensagemFaltaParaTroca(500)).toBe("Faltam R$ 5,00 para fechar a troca.")
  })
})
