// Duas vendas da última unidade ao mesmo tempo no balcão: as duas concluem (venda sem saldo não
// trava), uma delas com a falta registrada, e o saldo nunca fica negativo.
import type { Client } from "pg"
import { afterAll, afterEach, beforeAll, expect, it } from "vitest"

import {
  ADMINISTRADORA,
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

it("duas vendas da última unidade ao mesmo tempo: as duas concluem e o saldo termina em zero", async () => {
  const { variacaoId } = await criarProduto(dono)
  const forma = await dono.query(
    "insert into public.formas_venda (variacao_id, nome, fator, preco_centavos) values ($1, 'Unidade', 1, 100) returning id",
    [variacaoId],
  )
  const formaId: string = forma.rows[0].id
  await dono.query("select public.entrar_no_estoque($1, 1, 0.05, null, null, 'entrada_manual', 'estoque de teste', $2)", [
    variacaoId,
    ADMINISTRADORA,
  ])
  await dono.query("insert into public.caixas (aberto_por, troco_inicial_centavos) values ($1, 0)", [ADMINISTRADORA])

  const VENDER = `select * from public.registrar_venda(
    jsonb_build_array(jsonb_build_object('forma_venda_id', $1::uuid, 'quantidade', 1)), 0,
    jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor_centavos', 100)), 100)`
  const a = await abrirAba()
  const b = await abrirAba()
  await a.query(VENDER, [formaId])

  const vendaB = enviar(b, VENDER, [formaId])
  await esperarTerminarOuTravar(b, vendaB)
  await a.query("commit")
  const resultadoB = await vendaB
  await terminar(b, resultadoB)

  expect(resultadoB.ok).toBe(true)
  expect(await total("select count(*) as total from public.vendas")).toBe(2)
  expect(await total("select coalesce(sum(quantidade_sem_saldo_base), 0) as total from public.venda_itens")).toBe(1)
  expect(await total("select coalesce(sum(quantidade), 0) as total from public.saldos where variacao_id = $1", [variacaoId])).toBe(0)
})
