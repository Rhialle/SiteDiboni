import { describe, expect, it } from "vitest"

import { avisosDoInicio } from "./mensagens"

const SEM_NADA = {
  vencendo: 0,
  faixa_maior: 30,
  vencidos: 0,
  abaixo_minimo: 0,
  solicitacoes_pendentes: 0,
  conferencia_em: null,
  conferencia_divergencias: null,
}

describe("avisosDoInicio", () => {
  it("sem nada a avisar, a lista fica vazia", () => {
    expect(avisosDoInicio(SEM_NADA)).toEqual([])
  })

  it("monta um aviso por contagem maior que zero, com o link certo", () => {
    expect(
      avisosDoInicio({ ...SEM_NADA, vencendo: 2, vencidos: 1, abaixo_minimo: 3, solicitacoes_pendentes: 4 }),
    ).toEqual([
      { texto: "2 lote(s) vencem em até 30 dias", link: "/alertas" },
      { texto: "1 lote(s) vencidos com saldo", link: "/alertas" },
      { texto: "3 variação(ões) abaixo do estoque mínimo", link: "/alertas" },
      { texto: "4 solicitação(ões) pendente(s)", link: "/estoque/solicitacoes" },
    ])
  })

  it("a conferência só aparece quando achou diferença", () => {
    expect(avisosDoInicio({ ...SEM_NADA, conferencia_em: "2026-10-27T09:00:00Z", conferencia_divergencias: 0 })).toEqual([])
    expect(avisosDoInicio({ ...SEM_NADA, conferencia_em: "2026-10-27T09:00:00Z", conferencia_divergencias: 2 })).toEqual([
      { texto: "A conferência de 27/10/2026 achou 2 diferença(s) entre saldo e movimentações.", link: null },
    ])
  })
})
