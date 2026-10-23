import { describe, expect, it } from "vitest"

import { normalizarEmail } from "./email"

describe("normalizarEmail", () => {
  it("tira espaços e deixa em minúsculas", () => {
    expect(normalizarEmail("  Maria@Loja.COM ")).toBe("maria@loja.com")
  })
})
