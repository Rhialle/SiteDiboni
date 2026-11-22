import { describe, expect, it } from "vitest"

import { compararContagens, contarLinhasDoCopy } from "./contagem.mjs"

const DADOS = String.raw`--
-- PostgreSQL database dump
--
SET statement_timeout = 0;

COPY "auth"."users" ("id", "email") FROM stdin;
00000000-0000-0000-0000-00000000000a	dona@loja.test
\.

COPY "public"."produtos" ("id", "nome", "descricao") FROM stdin;
1	Forminha	Linha 1\nLinha 2
2	Caixa	Barra \\ no meio
\.

COPY "public"."verificacoes_integridade" ("executada_em", "divergencias") FROM stdin;
\.

SELECT pg_catalog.setval('"public"."produtos_id_seq"', 2, true);
`

describe("contarLinhasDoCopy", () => {
  it("conta as linhas de cada bloco COPY, com o esquema", () => {
    expect(contarLinhasDoCopy(DADOS)).toEqual({
      "auth.users": 1,
      "public.produtos": 2,
      "public.verificacoes_integridade": 0,
    })
  })

  it("quebra de linha e barra escapadas dentro do campo não contam como linha a mais", () => {
    expect(contarLinhasDoCopy(DADOS)["public.produtos"]).toBe(2)
  })

  it("linhas fora dos blocos COPY não contam", () => {
    expect(Object.keys(contarLinhasDoCopy("SET x = 0;\n-- comentário\nSELECT 1;\n"))).toEqual([])
  })

  it("aceita o nome da tabela sem aspas", () => {
    expect(contarLinhasDoCopy("COPY public.lotes (id) FROM stdin;\n1\n2\n3\n\\.\n")).toEqual({ "public.lotes": 3 })
  })

  it("aceita o fim de linha do Windows", () => {
    expect(contarLinhasDoCopy('COPY "public"."lotes" ("id") FROM stdin;\r\n1\r\n\\.\r\n')).toEqual({ "public.lotes": 1 })
  })
})

describe("compararContagens", () => {
  it("tudo igual não dá diferença", () => {
    expect(compararContagens({ "public.produtos": 2 }, { "public.produtos": 2 })).toEqual([])
  })

  it("número diferente diz os dois números", () => {
    expect(compararContagens({ "public.produtos": 12 }, { "public.produtos": 11 })).toEqual([
      "public.produtos: na cópia 12, restaurado 11",
    ])
  })

  it("tabela que não voltou diz que não foi restaurada", () => {
    expect(compararContagens({ "public.lotes": 3 }, {})).toEqual(["public.lotes: não restaurada"])
  })
})
