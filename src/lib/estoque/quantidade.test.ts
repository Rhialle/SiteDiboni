import { describe, expect, it } from "vitest"

import {
  custoUnitarioBase,
  escolherUnidade,
  formatarQuantidade,
  paraUnidadeBase,
  unidadesDeDigitacao,
} from "./quantidade"

describe("paraUnidadeBase", () => {
  it("multiplica pelo fator da forma de venda", () => {
    expect(paraUnidadeBase("3", 100, 0)).toBe(300)
    expect(paraUnidadeBase("1.000", 1, 0)).toBe(1000)
  })

  it("aceita kg com até 3 casas e devolve gramas", () => {
    expect(paraUnidadeBase("1,250", 1000, 3)).toBe(1250)
    expect(paraUnidadeBase("0,5", 1000, 3)).toBe(500)
  })

  it("recusa casas demais, fração onde não cabe, zero e texto", () => {
    expect(paraUnidadeBase("1,2505", 1000, 3)).toBeNull()
    expect(paraUnidadeBase("2,5", 1, 0)).toBeNull()
    expect(paraUnidadeBase("0", 1, 0)).toBeNull()
    expect(paraUnidadeBase("-3", 1, 0)).toBeNull()
    expect(paraUnidadeBase("", 1, 0)).toBeNull()
    expect(paraUnidadeBase("abc", 1, 0)).toBeNull()
  })
})

describe("custoUnitarioBase", () => {
  it("divide o custo da unidade escolhida pelo fator, com 6 casas", () => {
    expect(custoUnitarioBase("12,00", 100)).toBe("0.120000")
    expect(custoUnitarioBase("32,00", 1000)).toBe("0.032000")
    expect(custoUnitarioBase("0,05", 1)).toBe("0.050000")
  })

  it("brinde entra com zero; texto que não é valor é recusado", () => {
    expect(custoUnitarioBase("0,00", 1)).toBe("0.000000")
    expect(custoUnitarioBase("abc", 1)).toBeNull()
    expect(custoUnitarioBase("", 1)).toBeNull()
  })
})

describe("unidadesDeDigitacao", () => {
  const formas = [
    { id: "f1", nome: "Caixa com 100", fator: 100, peso_variavel: false, ativa: true },
    { id: "f2", nome: "Pacote com 10", fator: 10, peso_variavel: false, ativa: false },
    { id: "f3", nome: "Unidade", fator: 1, peso_variavel: false, ativa: true },
  ]

  it("produto por unidade: unidades e as formas ativas com mais de uma unidade", () => {
    expect(unidadesDeDigitacao("unidade", formas)).toEqual([
      { valor: "un", rotulo: "unidade(s)", fator: 1, casas: 0 },
      { valor: "forma:f1", rotulo: "Caixa com 100", fator: 100, casas: 0 },
    ])
  })

  it("produto por peso: gramas ou kg com 3 casas", () => {
    expect(unidadesDeDigitacao("peso", [])).toEqual([
      { valor: "g", rotulo: "g", fator: 1, casas: 0 },
      { valor: "kg", rotulo: "kg", fator: 1000, casas: 3 },
    ])
  })
})

describe("escolherUnidade", () => {
  const unidades = unidadesDeDigitacao("unidade", [
    { id: "f1", nome: "Caixa com 100", fator: 100, peso_variavel: false, ativa: true },
  ])

  it("acha a unidade escolhida; vazio vale a primeira", () => {
    expect(escolherUnidade(unidades, "forma:f1")?.fator).toBe(100)
    expect(escolherUnidade(unidades, "")?.valor).toBe("un")
  })

  it("escolha que não existe mais (forma inativada em outra aba) não vira unidade", () => {
    expect(escolherUnidade(unidades, "forma:f2")).toBeNull()
  })
})

describe("formatarQuantidade", () => {
  it("mostra a unidade base com separador de milhar", () => {
    expect(formatarQuantidade(1234, "unidade")).toBe("1.234 un")
    expect(formatarQuantidade(5000, "peso")).toBe("5.000 g")
    expect(formatarQuantidade(-60, "unidade")).toBe("-60 un")
  })
})
