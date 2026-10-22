import { describe, expect, it } from "vitest"

import { exigirVariavel } from "./ambiente"

describe("exigirVariavel", () => {
  it("devolve o valor quando a variável existe", () => {
    expect(exigirVariavel("http://127.0.0.1:54321", "NEXT_PUBLIC_SUPABASE_URL")).toBe(
      "http://127.0.0.1:54321",
    )
  })

  it("explica qual variável falta", () => {
    expect(() => exigirVariavel(undefined, "SUPABASE_SECRET_KEY")).toThrow(
      "Variável de ambiente SUPABASE_SECRET_KEY não configurada.",
    )
  })

  it("trata texto vazio como ausente", () => {
    expect(() => exigirVariavel("", "NEXT_PUBLIC_SUPABASE_URL")).toThrow(
      "Variável de ambiente NEXT_PUBLIC_SUPABASE_URL não configurada.",
    )
  })
})
