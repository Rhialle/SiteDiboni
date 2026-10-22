import { describe, expect, it } from "vitest"

import { cnpjValido, formatarCnpj, normalizarCnpj } from "./cnpj"

describe("cnpjValido", () => {
  it("aceita CNPJ com máscara e dígitos certos", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true)
  })

  it("recusa dígito verificador errado", () => {
    expect(cnpjValido("11222333000182")).toBe(false)
  })

  it("recusa todos os dígitos iguais", () => {
    expect(cnpjValido("00000000000000")).toBe(false)
  })

  it("recusa quantidade errada de dígitos", () => {
    expect(cnpjValido("1122233300018")).toBe(false)
  })
})

describe("normalizarCnpj", () => {
  it("deixa só os dígitos", () => {
    expect(normalizarCnpj(" 11.222.333/0001-81 ")).toBe("11222333000181")
  })
})

describe("formatarCnpj", () => {
  it("coloca a máscara", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81")
  })
})
