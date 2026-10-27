import { describe, expect, it } from "vitest"

import { lerCamposDoProduto, problemaDosCamposDoProduto } from "./produto-form"

function formulario(campos: Record<string, string | string[]>): FormData {
  const dados = new FormData()
  for (const [nome, valor] of Object.entries(campos)) {
    for (const v of Array.isArray(valor) ? valor : [valor]) dados.append(nome, v)
  }
  return dados
}

describe("lerCamposDoProduto", () => {
  it("limpa máscaras, lê listas e caixas marcadas", () => {
    const valores = lerCamposDoProduto(
      formulario({
        nome: "  Caixa  ",
        tipo_venda: "peso",
        ncm: "4819.10.00",
        categorias: ["a", "b"],
        apto_forno: "on",
      }),
    )
    expect(valores.nome).toBe("Caixa")
    expect(valores.tipo_venda).toBe("peso")
    expect(valores.ncm).toBe("48191000")
    expect(valores.categorias).toEqual(["a", "b"])
    expect(valores.marcados).toEqual(["apto_forno"])
  })

  it("trata tipo de venda desconhecido como por unidade", () => {
    expect(lerCamposDoProduto(formulario({ tipo_venda: "x" })).tipo_venda).toBe("unidade")
  })
})

describe("problemaDosCamposDoProduto", () => {
  const base = lerCamposDoProduto(formulario({ nome: "Caixa" }))

  it("aceita NCM e CEST vazios", () => {
    expect(problemaDosCamposDoProduto(base)).toBeNull()
  })

  it("recusa NCM e CEST com tamanho errado", () => {
    expect(problemaDosCamposDoProduto({ ...base, ncm: "4819100" })).toBe("O NCM precisa ter 8 dígitos.")
    expect(problemaDosCamposDoProduto({ ...base, cest: "123" })).toBe("O CEST precisa ter 7 dígitos.")
  })
})
