// Duas abas (ou dois cliques) gravando ao mesmo tempo no catálogo: as regras do banco valem mesmo assim.
import type { Client } from "pg"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  abrirAba,
  conectarComoDono,
  criarProduto,
  enviar,
  esperarTerminarOuTravar,
  fecharAbas,
  limparCatalogo,
  prepararAdministradora,
  removerAdministradora,
  terminar,
} from "./apoio"

const FAIXA_FORA_DE_ORDEM = "O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior."
const LIMITE_DE_FOTOS = "Cada produto pode ter até 8 fotos."
const PESO_SO_GRANEL = "Produto vendido por peso só tem forma a granel."
const TIPO_NAO_COMBINA = "Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele."

let dono: Client

beforeAll(async () => {
  dono = await conectarComoDono()
  await limparCatalogo(dono)
  await prepararAdministradora(dono)
})

afterEach(fecharAbas)

afterAll(async () => {
  await limparCatalogo(dono)
  await removerAdministradora(dono)
  await dono.end()
})

async function total(sql: string, valores: unknown[] = []): Promise<number> {
  return Number((await dono.query(sql, valores)).rows[0].total)
}

describe("faixas de preço na mesma forma de venda", () => {
  const INSERIR_FAIXA =
    "insert into public.faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values ($1, $2, $3)"

  async function formaDe600(): Promise<string> {
    const { variacaoId } = await criarProduto(dono)
    const forma = await dono.query(
      "insert into public.formas_venda (variacao_id, nome, fator, preco_centavos) values ($1, 'Pacote com 100', 100, 600) returning id",
      [variacaoId],
    )
    return forma.rows[0].id
  }

  async function faixasDe(forma: string) {
    const { rows } = await dono.query(
      "select quantidade_minima, preco_centavos from public.faixas_preco where forma_venda_id = $1 order by 1",
      [forma],
    )
    return rows
  }

  it("10+ a 5,40 e 20+ a 5,50 gravadas ao mesmo tempo: a segunda a confirmar é recusada", async () => {
    const forma = await formaDe600()
    const a = await abrirAba()
    const b = await abrirAba()
    await a.query(INSERIR_FAIXA, [forma, 10, 540])
    await b.query(INSERIR_FAIXA, [forma, 20, 550])

    expect(await enviar(a, "commit")).toMatchObject({ ok: true })
    expect(await enviar(b, "commit")).toEqual({ ok: false, erro: FAIXA_FORA_DE_ORDEM })
    expect(await faixasDe(forma)).toEqual([{ quantidade_minima: 10, preco_centavos: 540 }])
  })

  it("conferida antes do fim (como no reajuste em massa), a segunda espera a primeira e é recusada", async () => {
    const forma = await formaDe600()
    const a = await abrirAba()
    const b = await abrirAba()
    await a.query(INSERIR_FAIXA, [forma, 10, 540])
    await a.query("set constraints public.faixas_em_ordem immediate")
    await b.query(INSERIR_FAIXA, [forma, 20, 550])

    const conferenciaB = enviar(b, "set constraints public.faixas_em_ordem immediate")
    await esperarTerminarOuTravar(b, conferenciaB)
    await a.query("commit")
    const resultadoB = await conferenciaB
    await terminar(b, resultadoB)

    expect(resultadoB).toEqual({ ok: false, erro: FAIXA_FORA_DE_ORDEM })
    expect(await faixasDe(forma)).toEqual([{ quantidade_minima: 10, preco_centavos: 540 }])
  })
})

describe("limite de 8 fotos", () => {
  it("duas fotos enviadas ao mesmo tempo num produto com 7: fica com 8", async () => {
    const { produtoId } = await criarProduto(dono)
    await dono.query(
      "insert into public.fotos (produto_id, caminho, ordem) select $1::uuid, $1::text || '/' || i || '.jpg', i from generate_series(0, 6) i",
      [produtoId],
    )
    const INSERIR_FOTO = "insert into public.fotos (produto_id, caminho, ordem) values ($1, $2, 7)"
    const a = await abrirAba()
    const b = await abrirAba()
    await a.query(INSERIR_FOTO, [produtoId, `${produtoId}/a.jpg`])

    const fotoB = enviar(b, INSERIR_FOTO, [produtoId, `${produtoId}/b.jpg`])
    await esperarTerminarOuTravar(b, fotoB)
    await a.query("commit")
    const resultadoB = await fotoB
    await terminar(b, resultadoB)

    expect(resultadoB).toEqual({ ok: false, erro: LIMITE_DE_FOTOS })
    expect(await total("select count(*) as total from public.fotos where produto_id = $1", [produtoId])).toBe(8)
  })
})

describe("forma de venda e tipo de venda do produto", () => {
  const MUDAR_PARA_PESO = "update public.produtos set tipo_venda = 'peso' where id = $1"
  const INSERIR_FORMA_POR_UNIDADE =
    "insert into public.formas_venda (variacao_id, nome, fator, preco_centavos) values ($1, 'Pacote com 100', 100, 600)"
  const FORMAS_QUE_NAO_COMBINAM = `
    select count(*) as total from public.formas_venda f
    join public.variacoes v on v.id = f.variacao_id
    join public.produtos p on p.id = v.produto_id
    where f.peso_variavel <> (p.tipo_venda = 'peso')`

  it("uma aba muda para Por peso enquanto a outra cria forma por unidade: a forma é recusada", async () => {
    const { produtoId, variacaoId } = await criarProduto(dono)
    const a = await abrirAba()
    const b = await abrirAba()
    await a.query(MUDAR_PARA_PESO, [produtoId])

    const formaB = enviar(b, INSERIR_FORMA_POR_UNIDADE, [variacaoId])
    await esperarTerminarOuTravar(b, formaB)
    await a.query("commit")
    const resultadoB = await formaB
    await terminar(b, resultadoB)

    expect(resultadoB).toEqual({ ok: false, erro: PESO_SO_GRANEL })
    expect(await total(FORMAS_QUE_NAO_COMBINAM)).toBe(0)
  })

  it("uma aba cria forma por unidade enquanto a outra muda para Por peso: a mudança é recusada", async () => {
    const { produtoId, variacaoId } = await criarProduto(dono)
    const a = await abrirAba()
    const b = await abrirAba()
    await b.query(INSERIR_FORMA_POR_UNIDADE, [variacaoId])

    const mudancaA = enviar(a, MUDAR_PARA_PESO, [produtoId])
    await esperarTerminarOuTravar(a, mudancaA)
    await b.query("commit")
    const resultadoA = await mudancaA
    await terminar(a, resultadoA)

    expect(resultadoA).toEqual({ ok: false, erro: TIPO_NAO_COMBINA })
    expect(await total(FORMAS_QUE_NAO_COMBINAM)).toBe(0)
  })
})

describe("grade de variações", () => {
  const GRADE = JSON.stringify([
    { nome: "4 marrom", atributos: { Tamanho: "4", Cor: "marrom" } },
    { nome: "6 marrom", atributos: { Tamanho: "6", Cor: "marrom" } },
  ])
  const GERAR = "select public.gerar_grade($1, $2::jsonb) as criadas"
  const COM_ATRIBUTOS = "select count(*) as total from public.variacoes where produto_id = $1 and atributos <> '{}'"

  it("dois cliques em Gerar variações ao mesmo tempo criam cada combinação uma vez só", async () => {
    const { produtoId } = await criarProduto(dono)
    const a = await abrirAba()
    const b = await abrirAba()
    expect((await a.query(GERAR, [produtoId, GRADE])).rows).toEqual([{ criadas: 2 }])

    const gradeB = enviar(b, GERAR, [produtoId, GRADE])
    await esperarTerminarOuTravar(b, gradeB)
    await a.query("commit")
    const resultadoB = await gradeB
    await terminar(b, resultadoB)

    expect(resultadoB).toEqual({ ok: true, linhas: [{ criadas: 0 }] })
    expect(await total(COM_ATRIBUTOS, [produtoId])).toBe(2)
  })

  it("a mesma combinação gravada direto por duas abas: a segunda é recusada", async () => {
    const { produtoId } = await criarProduto(dono)
    const INSERIR = "insert into public.variacoes (produto_id, nome, atributos) values ($1, '4', '{\"Tamanho\": \"4\"}')"
    const a = await abrirAba()
    const b = await abrirAba()
    await a.query(INSERIR, [produtoId])

    const variacaoB = enviar(b, INSERIR, [produtoId])
    await esperarTerminarOuTravar(b, variacaoB)
    await a.query("commit")
    const resultadoB = await variacaoB
    await terminar(b, resultadoB)

    expect(resultadoB).toMatchObject({ ok: false, erro: expect.stringContaining("variacoes_atributos_por_produto") })
    expect(await total(COM_ATRIBUTOS, [produtoId])).toBe(1)
  })
})
