import { describe, expect, it } from "vitest"

import { CONTAS_DE_TESTE, entradaDeTesteLigada } from "./entrada-de-teste"

describe("entradaDeTesteLigada", () => {
  it("só liga com ENTRADA_DE_TESTE=1", () => {
    expect(entradaDeTesteLigada({ ENTRADA_DE_TESTE: "1" })).toBe(true)
    expect(entradaDeTesteLigada({ ENTRADA_DE_TESTE: "0" })).toBe(false)
    expect(entradaDeTesteLigada({ ENTRADA_DE_TESTE: "true" })).toBe(false)
    expect(entradaDeTesteLigada({})).toBe(false)
  })
})

describe("CONTAS_DE_TESTE", () => {
  it("usa endereços .test, que nunca recebem e-mail", () => {
    expect(CONTAS_DE_TESTE.administrador.email).toBe("admin.teste@diboni.test")
    expect(CONTAS_DE_TESTE.funcionario.email).toBe("funcionaria.teste@diboni.test")
  })
})
