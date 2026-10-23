import { describe, expect, it } from "vitest"

import { formatarData, formatarMoeda, formatarReais, reaisParaCentavos } from "./formatacao"

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

describe("formatarReais", () => {
  it("mostra centavos como número com vírgula, sem o símbolo", () => {
    expect(formatarReais(8000)).toBe("80,00")
    expect(formatarReais(123456)).toBe("1.234,56")
  })

  it("volta ao mesmo valor ao ler de novo", () => {
    expect(reaisParaCentavos(formatarReais(123456))).toBe(123456)
  })
})
