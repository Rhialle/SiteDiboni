import { describe, expect, it } from "vitest"

import { combinacoesDaGrade, lerGrade, novasCombinacoes } from "./grade"

describe("lerGrade", () => {
  it("lê um atributo por linha, com valores separados por vírgula", () => {
    expect(lerGrade("Tamanho: 4, 6, 12\nCor: marrom, branca")).toEqual({
      Tamanho: ["4", "6", "12"],
      Cor: ["marrom", "branca"],
    })
  })

  it("ignora linhas vazias e valores repetidos", () => {
    expect(lerGrade("\nCor: marrom, marrom ,branca\n\n")).toEqual({ Cor: ["marrom", "branca"] })
  })

  it("recusa linha sem dois-pontos ou sem valores", () => {
    expect(() => lerGrade("Tamanho 4")).toThrow("Grade inválida")
    expect(() => lerGrade("Tamanho:")).toThrow("Grade inválida")
    expect(() => lerGrade("   ")).toThrow("Grade inválida")
  })
})

describe("combinacoesDaGrade", () => {
  it("cria todas as combinações", () => {
    expect(combinacoesDaGrade({ Tamanho: ["4", "6", "12"], Cor: ["marrom", "branca"] })).toHaveLength(6)
  })

  it("dá nome juntando os valores na ordem dos atributos", () => {
    expect(combinacoesDaGrade({ Tamanho: ["4"], Cor: ["marrom"] })[0]).toEqual({
      nome: "4 marrom",
      atributos: { Tamanho: "4", Cor: "marrom" },
    })
  })
})

describe("novasCombinacoes", () => {
  it("deixa de fora as combinações que já existem, mesmo com atributos em outra ordem", () => {
    const novas = novasCombinacoes({ Tamanho: ["4", "6"], Cor: ["marrom"] }, [{ Cor: "marrom", Tamanho: "4" }])
    expect(novas).toEqual([{ nome: "6 marrom", atributos: { Tamanho: "6", Cor: "marrom" } }])
  })

  it("devolve vazio quando tudo já existe", () => {
    expect(novasCombinacoes({ Cor: ["marrom"] }, [{ Cor: "marrom" }])).toEqual([])
  })
})
