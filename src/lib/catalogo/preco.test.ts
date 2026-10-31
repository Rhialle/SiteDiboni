import { describe, expect, it } from "vitest"

import { precoPorPeso, precoTotal, precoUnitario } from "./preco"

const PACOTE = {
  preco_centavos: 600,
  faixas: [
    { quantidade_minima: 10, preco_centavos: 500 },
    { quantidade_minima: 2, preco_centavos: 550 },
  ],
}

describe("precoUnitario e precoTotal", () => {
  it("vale a maior faixa alcançada pela quantidade", () => {
    expect(precoUnitario(PACOTE, 1)).toBe(600)
    expect(precoUnitario(PACOTE, 2)).toBe(550)
    expect(precoUnitario(PACOTE, 9)).toBe(550)
    expect(precoUnitario(PACOTE, 10)).toBe(500)
    expect(precoTotal(PACOTE, 10)).toBe(5000)
  })

  it("sem faixas, o preço normal", () => {
    const unidade = { preco_centavos: 600, faixas: [] }
    expect(precoUnitario(unidade, 3)).toBe(600)
    expect(precoTotal(unidade, 3)).toBe(1800)
  })
})

describe("precoPorPeso", () => {
  it("preço do kg pelas gramas, arredondado ao centavo com meio para cima", () => {
    expect(precoPorPeso(3200, 250)).toBe(800)
    expect(precoPorPeso(3200, 333)).toBe(1066)
    expect(precoPorPeso(100, 5)).toBe(1)
    expect(precoPorPeso(3200, 0)).toBe(0)
  })
})
