import { describe, expect, it } from "vitest"

import { formatarDiasDeAlerta, lerDiasDeAlerta } from "./dias-alerta"

describe("lerDiasDeAlerta", () => {
  it("lê números separados por vírgula, com ou sem espaço", () => {
    expect(lerDiasDeAlerta("30, 15,7")).toEqual([30, 15, 7])
  })

  it("ordena do maior para o menor e tira repetidos", () => {
    expect(lerDiasDeAlerta("7, 30, 7, 15")).toEqual([30, 15, 7])
  })

  it("recusa texto vazio", () => {
    expect(() => lerDiasDeAlerta("  ")).toThrow("Dias inválidos")
  })

  it("recusa zero, negativos e números quebrados", () => {
    expect(() => lerDiasDeAlerta("30, 0")).toThrow("Dias inválidos")
    expect(() => lerDiasDeAlerta("-5")).toThrow("Dias inválidos")
    expect(() => lerDiasDeAlerta("7,5")).not.toThrow()
    expect(() => lerDiasDeAlerta("7.5")).toThrow("Dias inválidos")
  })
})

describe("formatarDiasDeAlerta", () => {
  it("junta com vírgula e espaço", () => {
    expect(formatarDiasDeAlerta([30, 15, 7])).toBe("30, 15, 7")
  })
})
