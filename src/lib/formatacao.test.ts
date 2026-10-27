import { describe, expect, it } from "vitest"

import {
  diaEmSaoPaulo,
  formatarCusto,
  formatarData,
  formatarDataHora,
  formatarDia,
  formatarMoeda,
  formatarReais,
  reaisParaCentavos,
} from "./formatacao"

describe("formatarMoeda", () => {
  it("formata centavos como reais", () => {
    expect(formatarMoeda(123456)).toBe("R$ 1.234,56")
  })

  it("formata valores menores que um real", () => {
    expect(formatarMoeda(5)).toBe("R$ 0,05")
  })
})

describe("formatarData", () => {
  it("usa o fuso de São Paulo", () => {
    expect(formatarData("2026-10-21T02:30:00Z")).toBe("20/10/2026")
  })
})

describe("reaisParaCentavos", () => {
  it("converte valor com vírgula", () => {
    expect(reaisParaCentavos("50,00")).toBe(5000)
  })

  it("aceita símbolo, milhar e uma casa decimal", () => {
    expect(reaisParaCentavos("R$ 1.234,5")).toBe(123450)
  })

  it("recusa texto que não é valor", () => {
    expect(() => reaisParaCentavos("abc")).toThrow("Valor inválido")
  })

  it("recusa valor negativo", () => {
    expect(() => reaisParaCentavos("-1,00")).toThrow("Valor inválido")
  })
})

describe("formatarDataHora", () => {
  it("mostra data e hora de São Paulo", () => {
    expect(formatarDataHora("2026-10-27T15:04:00Z")).toBe("27/10/2026 12:04")
    expect(formatarDataHora("2026-10-28T02:30:00Z")).toBe("27/10/2026 23:30")
  })
})

describe("diaEmSaoPaulo", () => {
  it("devolve a data AAAA-MM-DD no fuso de São Paulo", () => {
    expect(diaEmSaoPaulo(new Date("2026-10-28T02:00:00Z"))).toBe("2026-10-27")
    expect(diaEmSaoPaulo(new Date("2026-10-28T03:00:00Z"))).toBe("2026-10-28")
  })
})

describe("formatarDia", () => {
  it("troca AAAA-MM-DD por dd/mm/aaaa sem passar por fuso", () => {
    expect(formatarDia("2026-12-26")).toBe("26/12/2026")
    expect(formatarDia("2027-01-01")).toBe("01/01/2027")
  })
})

describe("formatarCusto", () => {
  it("mostra de 2 a 6 casas, sem zeros sobrando", () => {
    // O Intl põe um espaço que não quebra linha entre "R$" e o número.
    expect(formatarCusto("0.050000")).toBe("R$ 0,05")
    expect(formatarCusto("0.012500")).toBe("R$ 0,0125")
    expect(formatarCusto(1.5)).toBe("R$ 1,50")
  })
})

describe("formatarReais", () => {
  it("mostra centavos como número com vírgula, sem o símbolo", () => {
    expect(formatarReais(8000)).toBe("80,00")
    expect(formatarReais(123456)).toBe("1.234,56")
  })

  it("volta ao mesmo valor ao ler de novo", () => {
    expect(reaisParaCentavos(formatarReais(123456))).toBe(123456)
  })
})
