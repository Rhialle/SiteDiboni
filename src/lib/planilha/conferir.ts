import { MENSAGENS } from "@/lib/mensagens"

import { chaveDeNome } from "./celulas"
import { ABA_FORMAS, ABA_VARIACOES } from "./colunas"
import type {
  Aba,
  CatalogoAtual,
  DadosDaImportacao,
  ErroDaPlanilha,
  LinhaForma,
  LinhaVariacao,
  PlanilhaLida,
  Previa,
  VariacaoAtual,
} from "./tipos"

// A prévia da planilha (seção 9.2): compara as linhas com o catálogo atual, acha os erros que dependem
// dele e monta só o que é novo ou mudou. "A planilha manda": nas variações da planilha vale o que está
// nela; as formas só mudam nas variações que têm linhas na aba Formas de venda.

type Variacao = Omit<LinhaVariacao, "linha">
type Forma = Omit<LinhaForma, "linha">

// As colunas do produto, que precisam ser iguais em todas as linhas dele.
const COLUNAS_DO_PRODUTO: { coluna: string; valor: (v: Variacao) => string }[] = [
  { coluna: "Produto", valor: (v) => v.produto },
  { coluna: "NCM", valor: (v) => v.ncm ?? "" },
  { coluna: "Categorias", valor: (v) => v.categorias.map(chaveDeNome).join(";") },
  { coluna: "Materiais", valor: (v) => v.materiais.map(chaveDeNome).join(";") },
  { coluna: "Tipo de venda", valor: (v) => v.tipoVenda },
  { coluna: "Controla validade", valor: (v) => String(v.controlaValidade) },
  { coluna: "Forno", valor: (v) => String(v.aptoForno) },
  { coluna: "Freezer", valor: (v) => String(v.aptoFreezer) },
  { coluna: "Micro-ondas", valor: (v) => String(v.aptoMicroondas) },
  { coluna: "Alimento", valor: (v) => String(v.aptoAlimento) },
]

const doProduto = (v: Variacao) => COLUNAS_DO_PRODUTO.map((c) => c.valor(v)).join("|")
const daVariacao = (v: Variacao) =>
  JSON.stringify([v.variacao, v.codigoBarras, v.estoqueMinimo, v.comprimentoMm, v.larguraMm, v.alturaMm, v.capacidadeMl])

// Formas por código interno e, dentro dele, pelo nome (sem diferença de maiúsculas), na ordem da planilha.
function agruparFormas<T extends Forma>(formas: T[]): Map<string, Map<string, T[]>> {
  const porCodigo = new Map<string, Map<string, T[]>>()
  for (const forma of formas) {
    const porNome = porCodigo.get(forma.codigoInterno) ?? new Map<string, T[]>()
    porCodigo.set(forma.codigoInterno, porNome)
    const chave = chaveDeNome(forma.forma)
    porNome.set(chave, [...(porNome.get(chave) ?? []), forma])
  }
  return porCodigo
}

function paraFormaDosDados(linhas: Forma[]): DadosDaImportacao["formas"][number]["formas"][number] {
  // Sem a linha do preço normal já é erro; aqui a primeira linha só serve para a comparação não quebrar.
  const base = linhas.find((l) => l.quantidadeMinima === 1) ?? linhas[0]
  return {
    nome: base.forma,
    fator: base.fator,
    preco_centavos: base.precoCentavos,
    faixas: linhas
      .filter((l) => l.quantidadeMinima > 1)
      .sort((a, b) => a.quantidadeMinima - b.quantidadeMinima)
      .map((l) => ({ quantidade_minima: l.quantidadeMinima, preco_centavos: l.precoCentavos })),
  }
}

// Para comparar: as formas de uma variação em ordem de nome, com o nome sem diferença de maiúsculas.
function resumoDasFormas(porNome: Map<string, Forma[]> | undefined): string {
  return JSON.stringify(
    [...(porNome ?? new Map<string, Forma[]>()).entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([nome, linhas]) => ({ ...paraFormaDosDados(linhas), nome })),
  )
}

function paraVariacaoDosDados(v: Variacao): DadosDaImportacao["produtos"][number]["variacoes"][number] {
  return {
    codigo_interno: v.codigoInterno,
    nome: v.variacao,
    codigo_barras: v.codigoBarras,
    estoque_minimo: v.estoqueMinimo,
    comprimento_mm: v.comprimentoMm,
    largura_mm: v.larguraMm,
    altura_mm: v.alturaMm,
    capacidade_ml: v.capacidadeMl,
  }
}

export function conferirPlanilha(lida: PlanilhaLida, atual: CatalogoAtual): Previa {
  const erros: ErroDaPlanilha[] = [...lida.erros]
  const erro = (aba: Aba, linha: number, coluna: string, mensagem: string) => erros.push({ aba, linha, coluna, mensagem })
  const porCodigo = new Map(atual.variacoes.map((v) => [v.codigoInterno, v]))
  const atuaisPorProduto = new Map<string, VariacaoAtual[]>()
  for (const v of atual.variacoes) atuaisPorProduto.set(v.produtoId, [...(atuaisPorProduto.get(v.produtoId) ?? []), v])

  // Código interno repetido na aba: erro em todas as linhas dele.
  const vezes = new Map<string, number>()
  for (const v of lida.variacoes) vezes.set(v.codigoInterno, (vezes.get(v.codigoInterno) ?? 0) + 1)
  const unicas = lida.variacoes.filter((v) => {
    if (vezes.get(v.codigoInterno)! === 1) return true
    erro(ABA_VARIACOES, v.linha, "Código interno", MENSAGENS.codigoRepetidoPlanilha)
    return false
  })

  // De qual produto é cada linha. A nova entra no produto com o mesmo nome (o da planilha, se ele foi
  // renomeado nela); sem nenhum, é produto novo; com mais de um, é erro.
  const nomeNaPlanilha = new Map<string, string>()
  for (const v of unicas) {
    const existente = porCodigo.get(v.codigoInterno)
    if (existente && !nomeNaPlanilha.has(existente.produtoId)) nomeNaPlanilha.set(existente.produtoId, v.produto)
  }
  const idsPorNome = new Map<string, Set<string>>()
  for (const v of atual.variacoes) {
    const nome = chaveDeNome(nomeNaPlanilha.get(v.produtoId) ?? v.produto)
    idsPorNome.set(nome, (idsPorNome.get(nome) ?? new Set()).add(v.produtoId))
  }
  const grupos = new Map<string, { id: string | null; linhas: LinhaVariacao[] }>()
  const consideradas: LinhaVariacao[] = []
  for (const v of unicas) {
    let id = porCodigo.get(v.codigoInterno)?.produtoId ?? null
    if (!id) {
      const ids = idsPorNome.get(chaveDeNome(v.produto))
      if (ids && ids.size > 1) {
        erro(ABA_VARIACOES, v.linha, "Produto", MENSAGENS.produtoAmbiguo)
        continue
      }
      id = ids ? [...ids][0] : null
    }
    const chave = id ? `id:${id}` : `novo:${chaveDeNome(v.produto)}`
    const grupo = grupos.get(chave) ?? { id, linhas: [] }
    grupos.set(chave, grupo)
    grupo.linhas.push(v)
    consideradas.push(v)
  }

  // As colunas do produto iguais em todas as linhas dele; e o que o estoque não deixa mudar.
  for (const { id, linhas } of grupos.values()) {
    const [primeira, ...outras] = linhas
    for (const outra of outras) {
      for (const c of COLUNAS_DO_PRODUTO) {
        if (c.valor(outra) !== c.valor(primeira)) erro(ABA_VARIACOES, outra.linha, c.coluna, MENSAGENS.produtoDiferente)
      }
    }
    const atuais = id ? (atuaisPorProduto.get(id) ?? []) : []
    if (!atuais.length) continue
    if (primeira.tipoVenda !== atuais[0].tipoVenda) {
      if (atuais.some((v) => v.temMovimentacoes)) {
        erro(ABA_VARIACOES, primeira.linha, "Tipo de venda", MENSAGENS.tipoVendaComMovimentacao)
      } else if (atuais.some((v) => v.temFormas)) {
        erro(ABA_VARIACOES, primeira.linha, "Tipo de venda", MENSAGENS.tipoVendaConflito)
      }
    }
    if (primeira.controlaValidade !== atuais[0].controlaValidade && atuais.some((v) => v.temSaldo)) {
      erro(ABA_VARIACOES, primeira.linha, "Controla validade", MENSAGENS.validadeComSaldo)
    }
  }

  // Código de barras: um por variação. Trocar entre duas variações da planilha vale.
  const linhaDoCodigoBarras = new Map<string, LinhaVariacao>()
  for (const v of consideradas) {
    if (!v.codigoBarras) continue
    if (linhaDoCodigoBarras.has(v.codigoBarras)) erro(ABA_VARIACOES, v.linha, "Código de barras", MENSAGENS.codigoBarrasRepetido)
    else linhaDoCodigoBarras.set(v.codigoBarras, v)
  }
  const codigosNaPlanilha = new Set(lida.variacoes.map((v) => v.codigoInterno))
  for (const v of atual.variacoes) {
    const linha = v.codigoBarras ? linhaDoCodigoBarras.get(v.codigoBarras) : undefined
    if (linha && linha.codigoInterno !== v.codigoInterno && !codigosNaPlanilha.has(v.codigoInterno)) {
      erro(ABA_VARIACOES, linha.linha, "Código de barras", MENSAGENS.codigoBarrasRepetido)
    }
  }

  // Formas: o código precisa existir; cada forma com o preço normal, o mesmo fator e as faixas em ordem;
  // produto por peso com uma forma só, a granel.
  const tipoDoCodigo = new Map<string, "unidade" | "peso">(atual.variacoes.map((v) => [v.codigoInterno, v.tipoVenda]))
  for (const { linhas } of grupos.values()) for (const v of linhas) tipoDoCodigo.set(v.codigoInterno, linhas[0].tipoVenda)
  // O que já tem erro não é acusado de novo: as formas de uma variação que ficou de fora e as conferências
  // de uma forma com uma linha que ficou de fora (as faixas sem o preço normal, por exemplo).
  const codigosComErro = new Set(lida.codigosComErro)
  const formasComErro = new Set(lida.formasComErro.map((f) => `${f.codigoInterno}|${chaveDeNome(f.forma)}`))
  const formasDaPlanilha = agruparFormas(lida.formas)
  for (const [codigo, porNome] of formasDaPlanilha) {
    if (codigosComErro.has(codigo)) continue
    const todas = [...porNome.values()]
    if (!tipoDoCodigo.has(codigo)) {
      erro(ABA_FORMAS, todas[0][0].linha, "Código interno", MENSAGENS.variacaoNaoEncontrada)
      continue
    }
    const nomesComErro = [...porNome.keys()].filter((nome) => formasComErro.has(`${codigo}|${nome}`))
    for (const [nome, linhas] of porNome) {
      if (nomesComErro.includes(nome)) continue
      const quantidades = new Set<number>()
      for (const l of linhas) {
        if (quantidades.has(l.quantidadeMinima)) erro(ABA_FORMAS, l.linha, "Quantidade mínima", MENSAGENS.formaRepetidaPlanilha)
        quantidades.add(l.quantidadeMinima)
      }
      for (const l of linhas.slice(1)) if (l.fator !== linhas[0].fator) erro(ABA_FORMAS, l.linha, "Fator", MENSAGENS.fatorDiferente)
      const base = linhas.find((l) => l.quantidadeMinima === 1)
      if (!base) {
        erro(ABA_FORMAS, linhas[0].linha, "Quantidade mínima", MENSAGENS.formaSemPrecoNormal)
        continue
      }
      let anterior = base.precoCentavos
      for (const faixa of linhas.filter((l) => l.quantidadeMinima > 1).sort((a, b) => a.quantidadeMinima - b.quantidadeMinima)) {
        if (faixa.precoCentavos >= anterior) {
          erro(ABA_FORMAS, faixa.linha, "Preço (R$)", MENSAGENS.faixaForaDeOrdem)
          break
        }
        anterior = faixa.precoCentavos
      }
    }
    const granelErrado = todas.length > 1 || todas[0].some((l) => l.fator !== 1000 || l.quantidadeMinima !== 1)
    if (tipoDoCodigo.get(codigo) === "peso" && !nomesComErro.length && granelErrado) {
      erro(ABA_FORMAS, todas[0][0].linha, "Forma", MENSAGENS.granelPlanilha)
    }
  }

  // Contagem: cada variação da planilha é criada, atualizada ou fica sem mudança.
  const formasAtuais = agruparFormas(atual.formas)
  const formasMudaram = (codigo: string) =>
    formasDaPlanilha.has(codigo) && resumoDasFormas(formasDaPlanilha.get(codigo)) !== resumoDasFormas(formasAtuais.get(codigo))
  let criados = 0
  let atualizados = 0
  let semMudanca = 0
  const produtos: DadosDaImportacao["produtos"] = []
  for (const { id, linhas } of grupos.values()) {
    const gravar = linhas.filter((v) => {
      const existente = porCodigo.get(v.codigoInterno)
      if (!existente) {
        criados++
        return true
      }
      const mudou = daVariacao(v) !== daVariacao(existente) || doProduto(v) !== doProduto(existente)
      if (mudou || formasMudaram(v.codigoInterno)) atualizados++
      else semMudanca++
      return mudou
    })
    if (!gravar.length) continue
    const p = linhas[0]
    produtos.push({
      id,
      nome: p.produto,
      ncm: p.ncm,
      tipo_venda: p.tipoVenda,
      controla_validade: p.controlaValidade,
      apto_forno: p.aptoForno,
      apto_freezer: p.aptoFreezer,
      apto_microondas: p.aptoMicroondas,
      apto_alimento: p.aptoAlimento,
      categorias: p.categorias,
      materiais: p.materiais,
      variacoes: gravar.map(paraVariacaoDosDados),
    })
  }
  // Variações que só aparecem na aba Formas de venda.
  for (const codigo of formasDaPlanilha.keys()) {
    if (codigosNaPlanilha.has(codigo) || !porCodigo.has(codigo)) continue
    if (formasMudaram(codigo)) atualizados++
    else semMudanca++
  }
  const formas = [...formasDaPlanilha.entries()]
    .filter(([codigo]) => !porCodigo.has(codigo) || formasMudaram(codigo))
    .map(([codigo, porNome]) => ({ codigo_interno: codigo, formas: [...porNome.values()].map(paraFormaDosDados) }))

  const nadaAFazer = !produtos.length && !formas.length
  return { criados, atualizados, semMudanca, erros, dados: erros.length || nadaAFazer ? null : { produtos, formas } }
}
