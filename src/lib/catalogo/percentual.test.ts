import { describe, expect, it } from "vitest"

import { lerPercentual } from "./percentual"

describe("lerPercentual", () => {
  it("aceita inteiros, negativos, sinal de mais e vírgula", () => {
    expect(lerPercentual("10")).toBe(10)
    expect(lerPercentual("-5")).toBe(-5)
    expect(lerPercentual("+3")).toBe(3)
    expect(lerPercentual("2,5")).toBe(2.5)
    expect(lerPercentual(" 10 % ")).toBe(10)
  })

  it("recusa vazio, texto e reduções de 100% ou mais", () => {
    expect(() => lerPercentual("")).toThrow("Percentual inválido")
    expect(() => lerPercentual("dez")).toThrow("Percentual inválido")
    expect(() => lerPercentual("-100")).toThrow("Percentual inválido")
  })
})
