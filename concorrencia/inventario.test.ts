// Inventário com gente ao mesmo tempo: aprovação ajusta uma vez, a contagem não entra depois do
// encerramento e duas contagens do mesmo lote ficam numa linha só.
import type { Client } from "pg"
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest"

import {
  abrirAba,
  ADMINISTRADORA,
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
  await prepararAdministradora(dono)
})

beforeEach(async () => {
  await limparCatalogo(dono)
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

// Um produto sem validade com estoque, e um inventário dele já aberto (e confirmado).
async function prepararInventario(quantidade: number): Promise<{ variacaoId: string; inventarioId: number }> {
  const { variacaoId } = await criarProduto(dono)
  await dono.query(
    "select public.entrar_no_estoque($1, $2, 0.05, null, null, 'entrada_manual', 'estoque de teste', $3)",
    [variacaoId, quantidade, ADMINISTRADORA],
  )
  const preparo = await abrirAba()
  const resposta = await preparo.query("select public.abrir_inventario('Teste', 'loja', '{}', '{}') as id")
  await preparo.query("commit")
  return { variacaoId, inventarioId: Number(resposta.rows[0].id) }
}

const SALDO = "select coalesce(sum(quantidade), 0) as total from public.saldos where variacao_id = $1"

it("duas aprovações do mesmo inventário ao mesmo tempo: o estoque é ajustado uma vez", async () => {
  const { variacaoId, inventarioId } = await prepararInventario(100)
  const preparo = await abrirAba()
  await preparo.query("select public.contar_item($1, $2, null, 90)", [inventarioId, variacaoId])
  await preparo.query("select public.encerrar_contagem($1)", [inventarioId])
  await preparo.query("commit")

  const APROVAR = "select public.aprovar_inventario($1)"
  const a = await abrirAba()
  const b = await abrirAba()
  await a.query(APROVAR, [inventarioId])
  const aprovacaoB = enviar(b, APROVAR, [inventarioId])
  await esperarTerminarOuTravar(b, aprovacaoB)
  await a.query("commit")
  const resultadoB = await aprovacaoB
  await terminar(b, resultadoB)

  expect(resultadoB).toEqual({ ok: false, erro: "Este inventário não está mais em revisão." })
  expect(await total(SALDO, [variacaoId])).toBe(90)
  expect(await total("select count(*) as total from public.movimentacoes where tipo = 'ajuste_inventario'")).toBe(1)
})

it("contagem enviada enquanto o administrador encerra: não entra num inventário em revisão", async () => {
  const { variacaoId, inventarioId } = await prepararInventario(10)
  const a = await abrirAba()
  const b = await abrirAba()
  await a.query("select public.encerrar_contagem($1)", [inventarioId])
  const contagemB = enviar(b, "select public.contar_item($1, $2, null, 7)", [inventarioId, variacaoId])
  await esperarTerminarOuTravar(b, contagemB)
  await a.query("commit")
  const resultadoB = await contagemB
  await terminar(b, resultadoB)

  expect(resultadoB).toEqual({ ok: false, erro: "Este inventário não está mais em contagem." })
  expect(await total("select count(*) as total from public.inventario_itens where inventario_id = $1", [inventarioId])).toBe(0)
})

it("duas contagens do mesmo lote ao mesmo tempo: fica uma linha só", async () => {
  const { variacaoId, inventarioId } = await prepararInventario(10)
  const CONTAR = "select public.contar_item($1, $2, null, $3)"
  const a = await abrirAba()
  const b = await abrirAba()
  await a.query(CONTAR, [inventarioId, variacaoId, 10])
  const contagemB = enviar(b, CONTAR, [inventarioId, variacaoId, 20])
  await esperarTerminarOuTravar(b, contagemB)
  await a.query("commit")
  const resultadoB = await contagemB
  await terminar(b, resultadoB)

  expect(resultadoB.ok).toBe(true)
  expect(await total("select count(*) as total from public.inventario_itens where inventario_id = $1", [inventarioId])).toBe(1)
  expect(await total("select max(quantidade_contada) as total from public.inventario_itens where inventario_id = $1", [inventarioId])).toBe(20)
})
