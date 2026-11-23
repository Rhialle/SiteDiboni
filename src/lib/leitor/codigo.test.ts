import { describe, expect, it } from "vitest"

import { FORMATOS_LIDOS, limparCodigoLido } from "./codigo"

describe("limparCodigoLido", () => {
  it("tira espaços e a quebra de linha que o leitor às vezes manda junto", () => {
    expect(limparCodigoLido(" 7891000000014\n")).toBe("7891000000014")
    expect(limparCodigoLido("FM-1\r\n")).toBe("FM-1")
  })

  it("tira caracteres de controle do meio", () => {
    expect(limparCodigoLido("789\u00001000000014")).toBe("7891000000014")
  })

  it("vazio continua vazio", () => {
    expect(limparCodigoLido("   ")).toBe("")
  })
})

describe("FORMATOS_LIDOS", () => {
  it("lê os códigos de supermercado e o de etiqueta interna", () => {
    expect(FORMATOS_LIDOS).toEqual(["ean_13", "ean_8", "upc_a", "upc_e", "code_128"])
  })
})
