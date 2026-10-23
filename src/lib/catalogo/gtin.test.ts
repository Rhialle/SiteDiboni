import { describe, expect, it } from "vitest"

import { gtinValido } from "./gtin"

describe("gtinValido", () => {
  it("aceita EAN-13, EAN-8 e UPC-A com dígito certo", () => {
    expect(gtinValido("4006381333931")).toBe(true)
    expect(gtinValido("96385074")).toBe(true)
    expect(gtinValido("036000291452")).toBe(true)
  })

  it("recusa dígito verificador errado", () => {
    expect(gtinValido("4006381333932")).toBe(false)
  })

  it("recusa tamanho errado e letras", () => {
    expect(gtinValido("12345")).toBe(false)
    expect(gtinValido("400638133393A")).toBe(false)
  })
})
