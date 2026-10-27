import { describe, expect, it } from "vitest"

import { MENSAGENS, mensagemGradeCriada, mensagemPendencias, mensagemReajuste } from "@/lib/mensagens"

import { mensagemDoErroDoBanco } from "./erros"

describe("mensagemDoErroDoBanco", () => {
  it("traduz repetição pelo nome da restrição", () => {
    expect(
      mensagemDoErroDoBanco({
        code: "23505",
        message: 'duplicate key value violates unique constraint "variacoes_codigo_barras_key"',
      }),
    ).toBe("Este código de barras já está em outra variação.")
    expect(
      mensagemDoErroDoBanco({
        code: "23505",
        message: 'duplicate key value violates unique constraint "categorias_nome_por_pai"',
      }),
    ).toBe("Já existe uma categoria com este nome aqui.")
  })

  it("traduz item em uso pela chave estrangeira", () => {
    expect(
      mensagemDoErroDoBanco({
        code: "23503",
        message:
          'update or delete on table "categorias" violates foreign key constraint "produto_categorias_categoria_id_fkey" on table "produto_categorias"',
      }),
    ).toBe("Esta categoria tem subcategorias ou produtos e não pode ser apagada.")
  })

  it("avisa quando um item escolhido sumiu antes de gravar", () => {
    expect(
      mensagemDoErroDoBanco({
        code: "23503",
        message:
          'insert or update on table "produto_categorias" violates foreign key constraint "produto_categorias_categoria_id_fkey"',
      }),
    ).toBe("Algum item escolhido não existe mais. Recarregue a página e tente de novo.")
  })

  it("traduz o segundo estorno da mesma movimentação", () => {
    expect(
      mensagemDoErroDoBanco({
        code: "23505",
        message: 'duplicate key value violates unique constraint "movimentacoes_estorno_de_key"',
      }),
    ).toBe("Esta movimentação já foi estornada.")
  })

  it("traduz combinação de atributos repetida no mesmo produto", () => {
    expect(
      mensagemDoErroDoBanco({
        code: "23505",
        message: 'duplicate key value violates unique constraint "variacoes_atributos_por_produto"',
      }),
    ).toBe("Já existe uma variação com estes atributos.")
  })

  it("repassa a mensagem das regras do banco", () => {
    expect(mensagemDoErroDoBanco({ code: "P0001", message: "Cada produto pode ter até 8 fotos." })).toBe(
      "Cada produto pode ter até 8 fotos.",
    )
  })

  it("usa a mensagem genérica no resto", () => {
    expect(mensagemDoErroDoBanco({ code: "XX000", message: "algo" })).toBe(MENSAGENS.acaoFalhou)
  })
})

describe("mensagens do catálogo", () => {
  it("monta as frases com números e listas", () => {
    expect(mensagemPendencias(["categoria", "foto"])).toBe("Para ficar ativo falta: categoria, foto.")
    expect(mensagemReajuste(2)).toBe("Reajuste aplicado em 2 produto(s).")
    expect(mensagemGradeCriada(6)).toBe("6 variação(ões) criada(s).")
    expect(mensagemGradeCriada(0)).toBe("Nenhuma variação nova: todas as combinações já existiam.")
  })
})
