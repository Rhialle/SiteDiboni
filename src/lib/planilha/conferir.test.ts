import { describe, expect, it } from "vitest"

import { paraCatalogoAtual } from "./catalogo"
import { conferirPlanilha } from "./conferir"
import type { CatalogoAtual, LinhaForma, LinhaVariacao, PlanilhaLida, VariacaoAtual } from "./tipos"

const BASE: Omit<LinhaVariacao, "linha" | "variacao" | "codigoInterno" | "codigoBarras"> = {
  produto: "Caixa para bolo",
  ncm: "04021010",
  categorias: ["Bolos > Caixas", "Festa"],
  materiais: ["Papel"],
  tipoVenda: "unidade",
  controlaValidade: false,
  aptoForno: false,
  aptoFreezer: true,
  aptoMicroondas: false,
  aptoAlimento: true,
  estoqueMinimo: 0,
  comprimentoMm: null,
  larguraMm: null,
  alturaMm: null,
  capacidadeMl: null,
}
const P = { ...BASE, variacao: "P", codigoInterno: "CX-P", codigoBarras: "7891000000014" }
const G = { ...BASE, variacao: "G", codigoInterno: "CX-G", codigoBarras: "7891000000021" }
const TAMPA = { ...BASE, produto: "Tampa", ncm: null, categorias: [], materiais: [], variacao: "Padrão", codigoInterno: "TP-1", codigoBarras: "7891000000038" }

const atual = (v: Omit<LinhaVariacao, "linha">, produtoId: string, extra: Partial<VariacaoAtual> = {}): VariacaoAtual => ({
  ...v,
  produtoId,
  temMovimentacoes: false,
  temSaldo: false,
  temFormas: false,
  ...extra,
})
const PACOTE: Omit<LinhaForma, "linha">[] = [
  { codigoInterno: "CX-P", forma: "Pacote com 10", fator: 10, quantidadeMinima: 1, precoCentavos: 1500 },
  { codigoInterno: "CX-P", forma: "Pacote com 10", fator: 10, quantidadeMinima: 5, precoCentavos: 1400 },
]
const CATALOGO: CatalogoAtual = {
  variacoes: [atual(P, "p1", { temFormas: true }), atual(G, "p1"), atual(TAMPA, "p2")],
  formas: PACOTE,
}

// A planilha: as linhas recebem o número da linha do Excel (a primeira de dados é a 2).
function lida(variacoes: Omit<LinhaVariacao, "linha">[], formas: Omit<LinhaForma, "linha">[] = [], erros: PlanilhaLida["erros"] = []): PlanilhaLida {
  return {
    variacoes: variacoes.map((v, i) => ({ ...v, linha: i + 2 })),
    formas: formas.map((f, i) => ({ ...f, linha: i + 2 })),
    erros,
  }
}

const MESMO_PRODUTO = "As linhas do mesmo produto precisam ter o mesmo valor nesta coluna."
const SO_GRANEL = "Produto por peso tem uma forma só, com fator 1000 e preço por kg, sem faixas."

describe("paraCatalogoAtual", () => {
  it("lê o jsonb de catalogo_para_planilha e abre as faixas em linhas", () => {
    const json = {
      variacoes: [
        {
          produto_id: "p1", produto: "Caixa para bolo", variacao: "P", codigo_interno: "CX-P", codigo_barras: "7891000000014",
          ncm: "04021010", categorias: ["Bolos > Caixas", "Festa"], materiais: ["Papel"], tipo_venda: "unidade",
          controla_validade: false, apto_forno: false, apto_freezer: true, apto_microondas: false, apto_alimento: true,
          estoque_minimo: 0, comprimento_mm: null, largura_mm: null, altura_mm: null, capacidade_ml: null,
          tem_movimentacoes: false, tem_saldo: false, tem_formas: true,
        },
      ],
      formas: [
        { codigo_interno: "CX-P", forma: "Pacote com 10", fator: 10, preco_centavos: 1500, faixas: [{ quantidade_minima: 5, preco_centavos: 1400 }] },
      ],
    }
    expect(paraCatalogoAtual(json)).toEqual({ variacoes: [atual(P, "p1", { temFormas: true })], formas: PACOTE })
  })
})

describe("conferirPlanilha", () => {
  it("planilha igual ao catálogo: tudo sem mudança e nada a gravar", () => {
    expect(conferirPlanilha(lida([P, G], PACOTE), CATALOGO)).toEqual({
      criados: 0,
      atualizados: 0,
      semMudanca: 2,
      erros: [],
      dados: null,
    })
  })

  it("categorias, materiais e formas comparados sem diferença de maiúsculas", () => {
    const formas = PACOTE.map((f) => ({ ...f, forma: "pacote com 10" }))
    const previa = conferirPlanilha(lida([{ ...P, categorias: ["bolos > caixas", "Festa"], materiais: ["papel"] }], formas), CATALOGO)
    expect(previa).toMatchObject({ criados: 0, atualizados: 0, semMudanca: 1, dados: null })
  })

  it("uma variação nova e uma com o código de barras apagado vão para o banco", () => {
    const M = { ...BASE, variacao: "M", codigoInterno: "CX-M", codigoBarras: null }
    const previa = conferirPlanilha(lida([P, { ...G, codigoBarras: null }, M], PACOTE), CATALOGO)
    expect(previa).toMatchObject({ criados: 1, atualizados: 1, semMudanca: 1, erros: [] })
    const variacao = (v: typeof M) => ({
      codigo_interno: v.codigoInterno, nome: v.variacao, codigo_barras: null, estoque_minimo: 0,
      comprimento_mm: null, largura_mm: null, altura_mm: null, capacidade_ml: null,
    })
    expect(previa.dados).toEqual({
      produtos: [
        {
          id: "p1", nome: "Caixa para bolo", ncm: "04021010", tipo_venda: "unidade", controla_validade: false,
          apto_forno: false, apto_freezer: true, apto_microondas: false, apto_alimento: true,
          categorias: ["Bolos > Caixas", "Festa"], materiais: ["Papel"],
          variacoes: [variacao({ ...G, codigoBarras: null }), variacao(M)],
        },
      ],
      formas: [],
    })
  })

  it("só a forma mudou: conta como atualizada e só a forma vai para o banco", () => {
    const formas = [{ ...PACOTE[0], precoCentavos: 1600 }, PACOTE[1]]
    const previa = conferirPlanilha(lida([P, G], formas), CATALOGO)
    expect(previa).toMatchObject({ criados: 0, atualizados: 1, semMudanca: 1, erros: [] })
    expect(previa.dados).toEqual({
      produtos: [],
      formas: [
        {
          codigo_interno: "CX-P",
          formas: [{ nome: "Pacote com 10", fator: 10, preco_centavos: 1600, faixas: [{ quantidade_minima: 5, preco_centavos: 1400 }] }],
        },
      ],
    })
  })

  it("linhas novas com o mesmo Produto formam um produto novo", () => {
    const novo = { ...BASE, produto: "Forminha", ncm: null, categorias: [], materiais: [], codigoBarras: null }
    const previa = conferirPlanilha(lida([{ ...novo, variacao: "N4", codigoInterno: "FM-4" }, { ...novo, variacao: "N5", codigoInterno: "FM-5" }]), CATALOGO)
    expect(previa.criados).toBe(2)
    expect(previa.dados?.produtos).toHaveLength(1)
    expect(previa.dados?.produtos[0]).toMatchObject({ id: null, nome: "Forminha" })
    expect(previa.dados?.produtos[0].variacoes.map((v) => v.codigo_interno)).toEqual(["FM-4", "FM-5"])
  })

  it("linha nova com o nome de um produto que já existe entra nele", () => {
    const M = { ...BASE, variacao: "M", codigoInterno: "CX-M", codigoBarras: null }
    expect(conferirPlanilha(lida([P, M]), CATALOGO).dados?.produtos[0].id).toBe("p1")
    expect(conferirPlanilha(lida([{ ...M, produto: "caixa para bolo" }]), CATALOGO).dados?.produtos[0].id).toBe("p1")
  })

  it("linha nova com o nome de dois produtos que já existem é erro", () => {
    const catalogo = { ...CATALOGO, variacoes: [...CATALOGO.variacoes, atual({ ...TAMPA, codigoInterno: "TP-2", codigoBarras: null }, "p3")] }
    const nova = { ...TAMPA, codigoInterno: "TP-9", codigoBarras: null }
    expect(conferirPlanilha(lida([nova]), catalogo)).toMatchObject({
      erros: [{ aba: "Variações", linha: 2, coluna: "Produto", mensagem: "Há mais de um produto com este nome: para acrescentar a variação, use a ficha do produto." }],
      dados: null,
    })
  })

  it("o mesmo código interno em duas linhas é erro nas duas", () => {
    expect(conferirPlanilha(lida([P, P]), CATALOGO).erros).toEqual([
      { aba: "Variações", linha: 2, coluna: "Código interno", mensagem: "Este código interno aparece em mais de uma linha." },
      { aba: "Variações", linha: 3, coluna: "Código interno", mensagem: "Este código interno aparece em mais de uma linha." },
    ])
  })

  it("linhas do mesmo produto com NCM diferente: erro na que discorda da primeira", () => {
    expect(conferirPlanilha(lida([P, { ...G, ncm: "48192000" }]), CATALOGO).erros).toEqual([
      { aba: "Variações", linha: 3, coluna: "NCM", mensagem: MESMO_PRODUTO },
    ])
  })

  it("código de barras de uma variação fora da planilha é erro; trocar entre duas da planilha, não", () => {
    expect(conferirPlanilha(lida([{ ...G, codigoBarras: TAMPA.codigoBarras }]), CATALOGO).erros).toEqual([
      { aba: "Variações", linha: 2, coluna: "Código de barras", mensagem: "Este código de barras já está em outra variação." },
    ])
    const trocado = conferirPlanilha(lida([{ ...P, codigoBarras: G.codigoBarras }, { ...G, codigoBarras: P.codigoBarras }], PACOTE), CATALOGO)
    expect(trocado).toMatchObject({ erros: [], atualizados: 2 })
  })

  it("formas: sem o preço normal, fatores diferentes, faixa mais cara e linha repetida", () => {
    const erroDa = (formas: Omit<LinhaForma, "linha">[]) => conferirPlanilha(lida([P], formas), CATALOGO).erros
    expect(erroDa([PACOTE[1]])).toEqual([
      { aba: "Formas de venda", linha: 2, coluna: "Quantidade mínima", mensagem: "Falta a linha com quantidade mínima 1 (o preço normal) desta forma." },
    ])
    expect(erroDa([PACOTE[0], { ...PACOTE[1], fator: 12 }])).toEqual([
      { aba: "Formas de venda", linha: 3, coluna: "Fator", mensagem: "As linhas desta forma precisam ter o mesmo fator." },
    ])
    expect(erroDa([PACOTE[0], { ...PACOTE[1], precoCentavos: 1600 }])).toEqual([
      {
        aba: "Formas de venda", linha: 3, coluna: "Preço (R$)",
        mensagem: "O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.",
      },
    ])
    expect(erroDa([PACOTE[0], PACOTE[0]])).toEqual([
      { aba: "Formas de venda", linha: 3, coluna: "Quantidade mínima", mensagem: "Esta forma com esta quantidade mínima aparece em mais de uma linha." },
    ])
  })

  it("forma de um código que não existe em lugar nenhum", () => {
    const forma = { codigoInterno: "XX-9", forma: "Unidade", fator: 1, quantidadeMinima: 1, precoCentavos: 100 }
    expect(conferirPlanilha(lida([], [forma]), CATALOGO).erros).toEqual([
      { aba: "Formas de venda", linha: 2, coluna: "Código interno", mensagem: "Nenhuma variação com este código interno." },
    ])
  })

  it("produto por peso: uma forma só, fator 1000, sem faixas", () => {
    const granulado = { ...BASE, produto: "Granulado", tipoVenda: "peso" as const, variacao: "Chocolate", codigoInterno: "GR-1", codigoBarras: null }
    const granel = { codigoInterno: "GR-1", forma: "Granel", fator: 1000, quantidadeMinima: 1, precoCentavos: 3200 }
    expect(conferirPlanilha(lida([granulado], [granel]), CATALOGO).erros).toEqual([])
    for (const formas of [[{ ...granel, fator: 100 }], [granel, { ...granel, quantidadeMinima: 5, precoCentavos: 3000 }], [granel, { ...granel, forma: "Saco" }]]) {
      expect(conferirPlanilha(lida([granulado], formas), CATALOGO).erros.map((e) => e.mensagem)).toContain(SO_GRANEL)
    }
  })

  it("mudanças travadas pelo estoque e pelas formas", () => {
    const comMovimento = { ...CATALOGO, variacoes: [atual(TAMPA, "p2", { temMovimentacoes: true, temSaldo: true })] }
    expect(conferirPlanilha(lida([{ ...TAMPA, tipoVenda: "peso" }]), comMovimento).erros).toEqual([
      { aba: "Variações", linha: 2, coluna: "Tipo de venda", mensagem: "Não dá para mudar o tipo de venda: o produto já tem movimentações de estoque." },
    ])
    expect(conferirPlanilha(lida([{ ...TAMPA, controlaValidade: true }]), comMovimento).erros).toEqual([
      { aba: "Variações", linha: 2, coluna: "Controla validade", mensagem: "Não dá para mudar o controle de validade: o produto tem estoque." },
    ])
    expect(conferirPlanilha(lida([{ ...P, tipoVenda: "peso" }, { ...G, tipoVenda: "peso" }]), CATALOGO).erros).toEqual([
      { aba: "Variações", linha: 2, coluna: "Tipo de venda", mensagem: "Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele." },
    ])
  })

  it("os erros da leitura chegam junto e deixam nada a gravar", () => {
    const erroDaLeitura = { aba: "Variações" as const, linha: 9, coluna: "NCM", mensagem: "O NCM precisa ter 8 dígitos." }
    const previa = conferirPlanilha(lida([{ ...G, codigoBarras: null }], [], [erroDaLeitura]), CATALOGO)
    expect(previa.erros).toEqual([erroDaLeitura])
    expect(previa.dados).toBeNull()
  })
})
