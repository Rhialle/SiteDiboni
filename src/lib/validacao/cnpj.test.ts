import { describe, expect, it } from "vitest"

import { cnpjValido, formatarCnpj, normalizarCnpj } from "./cnpj"

describe("cnpjValido: CNPJ só com números", () => {
  it("aceita CNPJ com máscara e dígitos certos", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true)
  })

  it("aceita os CNPJs de teste das notas de exemplo", () => {
    expect(cnpjValido("11444777000161")).toBe(true)
    expect(cnpjValido("04252011000110")).toBe(true)
  })

  it("recusa dígito verificador errado", () => {
    expect(cnpjValido("11222333000182")).toBe(false)
    expect(cnpjValido("11222333000191")).toBe(false)
  })

  it("recusa todos os dígitos iguais", () => {
    expect(cnpjValido("00000000000000")).toBe(false)
    expect(cnpjValido("11111111111111")).toBe(false)
  })

  it("recusa quantidade errada de caracteres", () => {
    expect(cnpjValido("1122233300018")).toBe(false)
    expect(cnpjValido("112223330001811")).toBe(false)
    expect(cnpjValido("")).toBe(false)
  })
})

// Exemplos do "Perguntas e respostas: CNPJ alfanumérico" da Receita Federal
// (pergunta 14, com a conta passo a passo, e pergunta 23).
describe("cnpjValido: CNPJ alfanumérico", () => {
  it("aceita o exemplo da Receita 12.ABC.345/01DE-35", () => {
    expect(cnpjValido("12.ABC.345/01DE-35")).toBe(true)
    expect(cnpjValido("12ABC34501DE35")).toBe(true)
  })

  it("aceita filial com letra no número de ordem", () => {
    expect(cnpjValido("AA.345.678/000A-29")).toBe(true)
    expect(cnpjValido("12.345.678/000A-08")).toBe(true)
  })

  it("aceita letras minúsculas digitadas (vira maiúscula)", () => {
    expect(cnpjValido("12.abc.345/01de-35")).toBe(true)
  })

  it("recusa dígito verificador errado", () => {
    expect(cnpjValido("12ABC34501DE34")).toBe(false)
    expect(cnpjValido("12ABC34501DE53")).toBe(false)
    // Aparece na pergunta 23 só para mostrar o formato; os dígitos certos seriam 86.
    expect(cnpjValido("AA345678000329")).toBe(false)
  })

  it("recusa letra nos dígitos verificadores", () => {
    expect(cnpjValido("12ABC34501DE3A")).toBe(false)
  })

  it("recusa caracteres fora de 0–9 e A–Z", () => {
    expect(cnpjValido("12ÁBC34501DE35")).toBe(false)
  })
})

describe("normalizarCnpj", () => {
  it("tira a pontuação e os espaços", () => {
    expect(normalizarCnpj(" 11.222.333/0001-81 ")).toBe("11222333000181")
  })

  it("mantém as letras, em maiúsculas", () => {
    expect(normalizarCnpj("12.abc.345/01De-35")).toBe("12ABC34501DE35")
  })
})

describe("formatarCnpj", () => {
  it("coloca a máscara", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81")
  })

  it("coloca a máscara no CNPJ alfanumérico", () => {
    expect(formatarCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35")
  })
})
