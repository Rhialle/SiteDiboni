// Duas pessoas mexendo na mesma nota ao mesmo tempo: o estoque entra uma vez e a nota não duplica.
import type { Client } from "pg"
import { afterAll, afterEach, beforeAll, expect, it } from "vitest"

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

let dono: Client

beforeAll(async () => {
  dono = await conectarComoDono()
  await limparCatalogo(dono)
  await prepararAdministradora(dono)
  await dono.query("update public.configuracoes set cnpj_loja = '11222333000181' where id = 1")
})

afterEach(fecharAbas)

afterAll(async () => {
  await limparCatalogo(dono)
  await dono.query("update public.configuracoes set cnpj_loja = null where id = 1")
  await removerAdministradora(dono)
  await dono.end()
})

async function total(sql: string, valores: unknown[] = []): Promise<number> {
  return Number((await dono.query(sql, valores)).rows[0].total)
}

function nota(chave: string) {
  return {
    chave,
    emitente: { cnpj: "11444777000161", nome: "Embalagens Exemplo Ltda" },
    destinatario_cnpj: "11222333000181",
    numero: chave.slice(-3),
    serie: "1",
    emitida_em: "2026-10-20T10:00:00-03:00",
    caminho_xml: `${chave}.xml`,
    itens: [
      {
        numero_item: 1, codigo: "A1", descricao: "FORMINHA", codigo_barras: null, ncm: "48239099", unidade: "CX",
        quantidade: "2.0000", rastro: [],
        valores: { valor_produto: "10.00", desconto: "0", frete: "0", seguro: "0", outras_despesas: "0", ipi: "0", icms_st: "0" },
      },
    ],
  }
}

const IMPORTAR = "select public.importar_nota($1) as id"

it("duas confirmações da mesma nota ao mesmo tempo: o estoque entra uma vez", async () => {
  const { variacaoId } = await criarProduto(dono)
  const preparo = await abrirAba()
  const notaId = (await preparo.query(IMPORTAR, [nota("7".repeat(44))])).rows[0].id
  const item = await preparo.query("select id from public.notas_entrada_itens where nota_id = $1", [notaId])
  await preparo.query("select public.ligar_item_nota($1, $2, 100)", [item.rows[0].id, variacaoId])
  await preparo.query("commit")

  const CONFIRMAR = "select public.confirmar_nota($1)"
  const a = await abrirAba()
  const b = await abrirAba()
  await a.query(CONFIRMAR, [notaId])
  const confirmacaoB = enviar(b, CONFIRMAR, [notaId])
  await esperarTerminarOuTravar(b, confirmacaoB)
  await a.query("commit")
  const resultadoB = await confirmacaoB
  await terminar(b, resultadoB)

  expect(resultadoB).toEqual({ ok: false, erro: "Esta nota já foi confirmada ou descartada." })
  expect(await total("select count(*) as total from public.movimentacoes where origem = 'nota' and origem_id = $1", [notaId])).toBe(1)
  expect(await total("select coalesce(sum(quantidade), 0) as total from public.saldos where variacao_id = $1", [variacaoId])).toBe(200)
})

it("a mesma nota importada por duas pessoas ao mesmo tempo: só uma entra", async () => {
  const chave = "8".repeat(44)
  const a = await abrirAba()
  const b = await abrirAba()
  await a.query(IMPORTAR, [nota(chave)])
  const importacaoB = enviar(b, IMPORTAR, [nota(chave)])
  await esperarTerminarOuTravar(b, importacaoB)
  await a.query("commit")
  const resultadoB = await importacaoB
  await terminar(b, resultadoB)

  expect(resultadoB).toMatchObject({ ok: false, erro: expect.stringContaining("notas_entrada_chave_key") })
  expect(await total("select count(*) as total from public.notas_entrada where chave_acesso = $1", [chave])).toBe(1)
})
