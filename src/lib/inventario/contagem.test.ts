import { describe, expect, it } from "vitest"

import type { UnidadeDeDigitacao } from "@/lib/estoque/quantidade"

import { somarContagem } from "./contagem"

const UN: UnidadeDeDigitacao = { valor: "un", rotulo: "unidade(s)", fator: 1, casas: 0 }
const CAIXA: UnidadeDeDigitacao = { valor: "forma:cx", rotulo: "Caixa com 100", fator: 100, casas: 0 }
const PACOTE: UnidadeDeDigitacao = { valor: "forma:pc", rotulo: "Pacote com 10", fator: 10, casas: 0 }
const G: UnidadeDeDigitacao = { valor: "g", rotulo: "g", fator: 1, casas: 0 }
const KG: UnidadeDeDigitacao = { valor: "kg", rotulo: "kg", fator: 1000, casas: 3 }
const POR_UNIDADE = [UN, CAIXA, PACOTE]
const POR_PESO = [G, KG]

describe("somarContagem", () => {
  it("3 caixas + 4 pacotes = 340 un", () => {
    expect(somarContagem({ "forma:cx": "3", "forma:pc": "4" }, POR_UNIDADE)).toEqual({ ok: true, total: 340 })
  })

  it("unidades soltas somam com as formas", () => {
    expect(somarContagem({ un: "7", "forma:cx": "1", "forma:pc": "" }, POR_UNIDADE)).toEqual({ ok: true, total: 107 })
  })

  it("no produto por peso, kg com até 3 casas e g somam em gramas", () => {
    expect(somarContagem({ kg: "1,250", g: "30" }, POR_PESO)).toEqual({ ok: true, total: 1280 })
  })

  it("zero explícito vale", () => {
    expect(somarContagem({ un: "0" }, POR_UNIDADE)).toEqual({ ok: true, total: 0 })
  })

  it("nada digitado pede a quantidade", () => {
    expect(somarContagem({ un: "", "forma:cx": "  " }, POR_UNIDADE)).toEqual({
      ok: false,
      erro: "Informe a quantidade contada (0 se não há nenhum).",
    })
  })

  it("número inválido diz qual campo", () => {
    const invalido = (rotulo: string) => ({ ok: false, erro: `${rotulo}: use um número inteiro (em kg, até 3 casas).` })
    expect(somarContagem({ "forma:cx": "1,5" }, POR_UNIDADE)).toEqual(invalido("Caixa com 100"))
    expect(somarContagem({ kg: "1,2505" }, POR_PESO)).toEqual(invalido("kg"))
    expect(somarContagem({ un: "-2" }, POR_UNIDADE)).toEqual(invalido("unidade(s)"))
  })

  it("um campo de unidade que não existe mais", () => {
    expect(somarContagem({ "forma:sumiu": "2" }, POR_UNIDADE)).toEqual({
      ok: false,
      erro: "A unidade escolhida em “Em” não vale mais. Recarregue a página e confira.",
    })
  })
})
