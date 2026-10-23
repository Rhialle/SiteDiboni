import { describe, expect, it } from "vitest"

import { caminhoSeguro } from "./caminho-seguro"

describe("caminhoSeguro", () => {
  it("aceita caminho do próprio site", () => {
    expect(caminhoSeguro("/redefinir-senha", "/inicio")).toBe("/redefinir-senha")
  })

  it("usa o padrão quando não há caminho", () => {
    expect(caminhoSeguro(null, "/inicio")).toBe("/inicio")
  })

  it("recusa endereço de outro site", () => {
    expect(caminhoSeguro("https://site-falso.com", "/inicio")).toBe("/inicio")
  })

  it("recusa endereço que começa com duas barras", () => {
    expect(caminhoSeguro("//site-falso.com", "/inicio")).toBe("/inicio")
  })

  it("recusa barra seguida de contrabarra", () => {
    expect(caminhoSeguro("/\\site-falso.com", "/inicio")).toBe("/inicio")
  })
})
