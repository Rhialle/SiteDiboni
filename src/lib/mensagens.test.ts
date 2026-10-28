import { describe, expect, it } from "vitest"

import { avisosDoInicio, mensagemNotaImportada } from "./mensagens"

const SEM_NADA = {
  vencendo: 0,
  faixa_maior: 30,
  vencidos: 0,
  abaixo_minimo: 0,
  solicitacoes_pendentes: 0,
  conferencia_em: null,
  conferencia_divergencias: null,
  notas_aguardando: 0,
}

describe("avisosDoInicio", () => {
  it("sem nada a avisar, a lista fica vazia", () => {
    expect(avisosDoInicio(SEM_NADA)).toEqual([])
  })

  it("monta um aviso por contagem maior que zero, do mais urgente para o menos, com o link certo", () => {
    expect(
      avisosDoInicio({ ...SEM_NADA, vencendo: 2, vencidos: 1, abaixo_minimo: 3, solicitacoes_pendentes: 4 }),
    ).toEqual([
      {
        tipo: "vencidos",
        quantidade: 1,
        resto: "lote(s) vencidos com saldo",
        texto: "1 lote(s) vencidos com saldo",
        link: "/alertas",
      },
      {
        tipo: "vencendo",
        quantidade: 2,
        resto: "lote(s) vencem em até 30 dias",
        texto: "2 lote(s) vencem em até 30 dias",
        link: "/alertas",
      },
      {
        tipo: "abaixoDoMinimo",
        quantidade: 3,
        resto: "variação(ões) abaixo do estoque mínimo",
        texto: "3 variação(ões) abaixo do estoque mínimo",
        link: "/alertas",
      },
      {
        tipo: "solicitacoes",
        quantidade: 4,
        resto: "solicitação(ões) pendente(s)",
        texto: "4 solicitação(ões) pendente(s)",
        link: "/estoque/solicitacoes",
      },
    ])
  })

  it("notas aguardando o administrador levam para a lista já filtrada", () => {
    expect(avisosDoInicio({ ...SEM_NADA, notas_aguardando: 2 })).toEqual([
      {
        tipo: "notas",
        quantidade: 2,
        resto: "nota(s) aguardando o administrador",
        texto: "2 nota(s) aguardando o administrador",
        link: "/notas?situacao=aguardando_administrador",
      },
    ])
  })

  it("a conferência só aparece quando achou diferença", () => {
    expect(avisosDoInicio({ ...SEM_NADA, conferencia_em: "2026-10-27T09:00:00Z", conferencia_divergencias: 0 })).toEqual([])
    const texto = "A conferência de 27/10/2026 achou 2 diferença(s) entre saldo e movimentações."
    expect(avisosDoInicio({ ...SEM_NADA, conferencia_em: "2026-10-27T09:00:00Z", conferencia_divergencias: 2 })).toEqual([
      { tipo: "conferencia", quantidade: null, resto: texto, texto, link: null },
    ])
  })
})

describe("mensagemNotaImportada", () => {
  it("com todos os itens ligados, a nota fica pronta para revisar", () => {
    expect(mensagemNotaImportada("123", "Doces Exemplo Ltda", 0)).toBe(
      "Nota 123 de Doces Exemplo Ltda: importada, pronta para revisar.",
    )
  })

  it("com itens sem ligação, diz quantos o administrador precisa ligar", () => {
    expect(mensagemNotaImportada("456", "Embalagens Exemplo Ltda", 3)).toBe(
      "Nota 456 de Embalagens Exemplo Ltda: importada, aguardando o administrador ligar 3 item(ns).",
    )
  })
})
