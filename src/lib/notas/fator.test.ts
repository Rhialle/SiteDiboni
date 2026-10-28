import { describe, expect, it } from "vitest"

import { daInteiro, lerFator, quantidadeDaNota } from "./fator"

describe("lerFator", () => {
  it("aceita inteiro maior que zero", () => {
    expect(lerFator("12")).toBe(12)
    expect(lerFator(" 1000 ")).toBe(1000)
  })

  it("recusa vazio, zero, decimal, negativo e texto", () => {
    for (const texto of ["", "0", "1,5", "1.5", "-3", "doze", "1e3"]) expect(lerFator(texto)).toBeNull()
  })
})

describe("daInteiro", () => {
  it("2,5 CX × 2 dá 5; × 3 não dá inteiro", () => {
    expect(daInteiro("2.5000", 2)).toBe(true)
    expect(daInteiro("2.5000", 3)).toBe(false)
  })

  it("aceita o número como vem do banco e as 3 casas do lote", () => {
    expect(daInteiro(2.5, 4)).toBe(true)
    expect(daInteiro("1.500", 1000)).toBe(true)
    expect(daInteiro("0.0005", 1000)).toBe(false)
    expect(daInteiro(10, 1)).toBe(true)
  })
})

describe("quantidadeDaNota", () => {
  it("tira os zeros do fim e usa vírgula, como nas mensagens do banco", () => {
    expect(quantidadeDaNota("2.5000")).toBe("2,5")
    expect(quantidadeDaNota("10.0000")).toBe("10")
    expect(quantidadeDaNota(2.5)).toBe("2,5")
    expect(quantidadeDaNota("0.1250")).toBe("0,125")
  })
})
