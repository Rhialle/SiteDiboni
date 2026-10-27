// Duas operações de estoque ao mesmo tempo: as travas do banco (R10) deixam só uma passar.
import type { Client } from "pg"
import { afterAll, afterEach, beforeAll, expect, it } from "vitest"

import {
  ADMINISTRADORA,
  abrirAba,
  abrirTransacao,
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

const SALDO = "select coalesce(sum(quantidade), 0) as total from public.saldos where variacao_id = $1"

async function entrada(variacaoId: string, quantidade: number): Promise<string> {
  const { rows } = await dono.query(
    "select public.entrar_no_estoque($1, $2, 0.05, null, null, 'entrada_manual', 'estoque de teste', $3) as id",
    [variacaoId, quantidade, ADMINISTRADORA],
  )
  return rows[0].id
}

it("duas retiradas da última unidade ao mesmo tempo: exatamente uma consegue", async () => {
  const { variacaoId } = await criarProduto(dono)
  await entrada(variacaoId, 1)
  const RETIRAR = "select * from public.retirar_fefo($1, 1, 'ajuste_manual', 'venda de teste', $2)"
  const a = await abrirTransacao()
  const b = await abrirTransacao()
  await a.query(RETIRAR, [variacaoId, ADMINISTRADORA])

  const retiradaB = enviar(b, RETIRAR, [variacaoId, ADMINISTRADORA])
  await esperarTerminarOuTravar(b, retiradaB)
  await a.query("commit")
  const resultadoB = await retiradaB
  await terminar(b, resultadoB)

  expect(resultadoB).toEqual({ ok: false, erro: "Saldo insuficiente: há 0 un fora de lotes vencidos." })
  expect(await total(SALDO, [variacaoId])).toBe(0)
  expect(
    await total("select count(*) as total from public.movimentacoes where variacao_id = $1 and quantidade < 0", [variacaoId]),
  ).toBe(1)
})

it("dois estornos da mesma movimentação ao mesmo tempo: só um passa", async () => {
  const { variacaoId } = await criarProduto(dono)
  const entradaId = await entrada(variacaoId, 10)
  const ESTORNAR = "select public.estornar_movimentacao($1, 'lançada em dobro') as id"
  const a = await abrirAba()
  const b = await abrirAba()
  await a.query(ESTORNAR, [entradaId])

  const estornoB = enviar(b, ESTORNAR, [entradaId])
  await esperarTerminarOuTravar(b, estornoB)
  await a.query("commit")
  const resultadoB = await estornoB
  await terminar(b, resultadoB)

  expect(resultadoB).toEqual({ ok: false, erro: "Esta movimentação já foi estornada." })
  expect(await total(SALDO, [variacaoId])).toBe(0)
})

it("duas aprovações da mesma solicitação ao mesmo tempo: o estoque muda uma vez", async () => {
  const { variacaoId } = await criarProduto(dono)
  await entrada(variacaoId, 100)
  const lote = (await dono.query("select public.lote_geral($1) as id", [variacaoId])).rows[0].id
  const pedido = await dono.query(
    `insert into public.solicitacoes_ajuste (variacao_id, lote_id, tipo, quantidade, motivo, solicitado_por)
     values ($1, $2, 'perda_avaria', -10, 'caixa amassada', $3) returning id`,
    [variacaoId, lote, ADMINISTRADORA],
  )
  const APROVAR = "select public.decidir_solicitacao($1, true)"
  const a = await abrirAba()
  const b = await abrirAba()
  await a.query(APROVAR, [pedido.rows[0].id])

  const aprovacaoB = enviar(b, APROVAR, [pedido.rows[0].id])
  await esperarTerminarOuTravar(b, aprovacaoB)
  await a.query("commit")
  const resultadoB = await aprovacaoB
  await terminar(b, resultadoB)

  expect(resultadoB).toEqual({ ok: false, erro: "Esta solicitação já foi decidida." })
  expect(await total(SALDO, [variacaoId])).toBe(90)
})
