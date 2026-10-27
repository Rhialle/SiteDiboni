import { describe, expect, it } from "vitest"

import { caminhosDasCategorias, montarArvore } from "./arvore"

const categorias = [
  { id: "c", nome: "Caixas para bolo", categoria_pai_id: "b", ordem: 0 },
  { id: "d", nome: "Doces", categoria_pai_id: null, ordem: 0 },
  { id: "b", nome: "Bolos", categoria_pai_id: null, ordem: 0 },
]

describe("montarArvore", () => {
  it("põe as filhas dentro da mãe e ordena por nome", () => {
    const arvore = montarArvore(categorias)
    expect(arvore.map((no) => no.nome)).toEqual(["Bolos", "Doces"])
    expect(arvore[0].filhas.map((no) => no.nome)).toEqual(["Caixas para bolo"])
  })
})

describe("caminhosDasCategorias", () => {
  it("monta o caminho completo de cada categoria", () => {
    expect(caminhosDasCategorias(montarArvore(categorias))).toEqual([
      { id: "b", caminho: "Bolos" },
      { id: "c", caminho: "Bolos > Caixas para bolo" },
      { id: "d", caminho: "Doces" },
    ])
  })
})
