// Acesso direto ao banco local do CI, como dono, para o que o site não deixa fazer:
// limpar o estoque (movimentações não se apagam) e simular situações nos testes.
import { Client } from "pg"

const ENDERECO = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

// O inventário, as notas e os fornecedores apontam para as variações e os lotes, como o estoque: saem
// juntos, antes do catálogo.
export const TABELAS_DO_ESTOQUE = [
  "public.venda_devolucoes",
  "public.venda_pagamentos",
  "public.venda_itens",
  "public.vendas",
  "public.caixa_movimentos",
  "public.caixas",
  "public.inventario_itens",
  "public.inventario_escopo",
  "public.inventarios",
  "public.notas_entrada_item_lotes",
  "public.notas_entrada_itens_valores",
  "public.notas_entrada_itens",
  "public.notas_entrada",
  "public.fornecedor_itens",
  "public.fornecedores",
  "public.movimentacoes_custos",
  "public.movimentacoes",
  "public.solicitacoes_ajuste",
  "public.saldos",
  "public.lotes",
  "public.custos_variacao",
  "public.verificacoes_integridade",
].join(", ")

async function comoDono<T>(acao: (conexao: Client) => Promise<T>): Promise<T> {
  const conexao = new Client({ connectionString: ENDERECO })
  await conexao.connect()
  try {
    return await acao(conexao)
  } finally {
    await conexao.end()
  }
}

// Uma solicitação pendente, como se a pessoa tivesse passado do limite (no lote GERAL da variação).
export async function criarSolicitacaoTeste(dados: {
  variacaoId: string
  quantidade: number
  motivo: string
  solicitadoPor: string
  diasAtras?: number
}): Promise<void> {
  await comoDono((conexao) =>
    conexao.query(
      `insert into public.solicitacoes_ajuste (variacao_id, lote_id, tipo, quantidade, motivo, solicitado_por, solicitado_em)
       values ($1, public.lote_geral($1), 'perda_avaria', $2, $3, $4, now() - make_interval(days => $5))`,
      [dados.variacaoId, dados.quantidade, dados.motivo, dados.solicitadoPor, dados.diasAtras ?? 0],
    ),
  )
}

// Muitas solicitações já recusadas, mais recentes que qualquer pendente criada com diasAtras.
export async function criarSolicitacoesDecididasTeste(variacaoId: string, quantas: number, pessoa: string): Promise<void> {
  await comoDono((conexao) =>
    conexao.query(
      `insert into public.solicitacoes_ajuste
         (variacao_id, lote_id, tipo, quantidade, motivo, solicitado_por, situacao, decidido_por, decidido_em)
       select $1, public.lote_geral($1), 'perda_avaria', -1, 'decidida ' || n, $3, 'recusada', $3, now()
       from generate_series(1, $2) as n`,
      [variacaoId, quantas, pessoa],
    ),
  )
}

// Uma movimentação direta no lote GERAL da variação (perda, ajuste...), em nome de quem for informado.
export async function movimentarTeste(dados: {
  variacaoId: string
  tipo: string
  quantidade: number
  motivo: string
  usuarioId: string
}): Promise<void> {
  await comoDono((conexao) =>
    conexao.query("select public.movimentar_lote(public.lote_geral($1), $2, $3, $4, $5)", [
      dados.variacaoId,
      dados.tipo,
      dados.quantidade,
      dados.motivo,
      dados.usuarioId,
    ]),
  )
}

// Roda agora a conferência que o pg_cron roda todo dia às 03:00.
export async function rodarConferencia(): Promise<void> {
  await comoDono((conexao) => conexao.query("select public.conferir_integridade_estoque()"))
}

// Mexe no saldo do lote GERAL sem movimentação, para a conferência achar uma diferença.
export async function alterarSaldoDireto(variacaoId: string, diferenca: number): Promise<void> {
  await comoDono((conexao) =>
    conexao.query("update public.saldos set quantidade = quantidade + $2 where lote_id = public.lote_geral($1)", [
      variacaoId,
      diferenca,
    ]),
  )
}

// O truncate não passa pelo gatilho que impede apagar movimentações (nem grava histórico).
export async function limparEstoque(): Promise<void> {
  await comoDono((conexao) => conexao.query(`truncate ${TABELAS_DO_ESTOQUE} restart identity cascade`))
}

// Um inventário em contagem da loja inteira, direto no banco (pelo site, só o administrador abre).
export async function criarInventarioTeste(
  descricao: string,
  abertoPor: string,
  situacao: "aberto" | "em_revisao" = "aberto",
): Promise<number> {
  return comoDono(async (conexao) => {
    const { rows } = await conexao.query(
      "insert into public.inventarios (descricao, escopo, aberto_por, situacao) values ($1, 'loja', $2, $3) returning id",
      [descricao, abertoPor, situacao],
    )
    return Number(rows[0].id)
  })
}

export async function lotesDaVariacao(variacaoId: string): Promise<number> {
  return comoDono(async (conexao) => {
    const { rows } = await conexao.query("select count(*) as total from public.lotes where variacao_id = $1", [variacaoId])
    return Number(rows[0].total)
  })
}

export async function itensDoInventario(inventarioId: number): Promise<number> {
  return comoDono(async (conexao) => {
    const { rows } = await conexao.query("select count(*) as total from public.inventario_itens where inventario_id = $1", [
      inventarioId,
    ])
    return Number(rows[0].total)
  })
}

// Balcão: um caixa aberto direto no banco (pelo site, quem abre é a tela do Caixa).
export async function abrirCaixaTeste(usuarioId: string, trocoCentavos = 0): Promise<number> {
  return comoDono(async (conexao) => {
    const { rows } = await conexao.query(
      "insert into public.caixas (aberto_por, troco_inicial_centavos) values ($1, $2) returning id",
      [usuarioId, trocoCentavos],
    )
    return Number(rows[0].id)
  })
}

// Um caixa já fechado, com o esperado e o contado do dinheiro.
export async function caixaFechadoTeste(
  usuarioId: string,
  dados: { esperadoCentavos: number; contadoCentavos: number },
): Promise<number> {
  return comoDono(async (conexao) => {
    const { rows } = await conexao.query(
      `insert into public.caixas (situacao, aberto_por, troco_inicial_centavos, fechado_por, fechado_em,
         esperado_dinheiro_centavos, informado_dinheiro_centavos, esperado_credito_centavos,
         esperado_debito_centavos, esperado_pix_centavos)
       values ('fechado', $1, 0, $1, now(), $2, $3, 0, 0, 0) returning id`,
      [usuarioId, dados.esperadoCentavos, dados.contadoCentavos],
    )
    return Number(rows[0].id)
  })
}

export async function codigoDeBarrasDaFormaTeste(formaId: string, codigo: string): Promise<void> {
  await comoDono((conexao) => conexao.query("update public.formas_venda set codigo_barras = $2 where id = $1", [formaId, codigo]))
}

// Uma venda feita como a pessoa (as regras do banco valem), paga em Pix, no caixa aberto.
export async function venderTeste(usuarioId: string, formaId: string, quantidade: number, totalCentavos: number): Promise<number> {
  return comoDono(async (conexao) => {
    await conexao.query("begin")
    await conexao.query("select tests.entrar_como($1, 'aal1')", [usuarioId])
    const { rows } = await conexao.query(
      `select numero from public.registrar_venda(
         jsonb_build_array(jsonb_build_object('forma_venda_id', $1::uuid, 'quantidade', $2::int)), 0,
         jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor_centavos', $3::int)), $3::int)`,
      [formaId, quantidade, totalCentavos],
    )
    await conexao.query("commit")
    return Number(rows[0].numero)
  })
}

// Muitas entradas de 1 un (cada uma com custo), para a loja passar de 1.000 custos guardados.
export async function muitasEntradasTeste(variacaoId: string, usuarioId: string, quantas: number): Promise<void> {
  await comoDono((conexao) =>
    conexao.query(
      "select public.entrar_no_estoque($1, 1, 0.05, null, null, 'entrada_manual', 'carga de teste', $2) from generate_series(1, $3)",
      [variacaoId, usuarioId, quantas],
    ),
  )
}

// Fecha o caixa aberto como a pessoa, informando o dinheiro contado.
export async function fecharCaixaTeste(usuarioId: string, dinheiroCentavos: number): Promise<void> {
  await comoDono(async (conexao) => {
    await conexao.query("begin")
    await conexao.query("select tests.entrar_como($1, 'aal1')", [usuarioId])
    await conexao.query("select * from public.fechar_caixa($1)", [dinheiroCentavos])
    await conexao.query("commit")
  })
}

// Cancela a venda como o administrador (com as duas etapas).
export async function cancelarVendaTeste(administradorId: string, numero: number, motivo: string): Promise<void> {
  await comoDono(async (conexao) => {
    await conexao.query("begin")
    await conexao.query("select tests.entrar_como($1, 'aal2')", [administradorId])
    await conexao.query("select public.cancelar_venda((select id from public.vendas where numero = $1), $2)", [numero, motivo])
    await conexao.query("commit")
  })
}

// Uma troca como a pessoa: leva `leva` (forma e quantidade), devolve `devolve`, e paga a diferença em
// dinheiro. Devolve o número da venda.
export async function trocaTeste(
  usuarioId: string,
  dados: {
    leva: { formaId: string; quantidade: number }
    devolve: { formaId: string; quantidade: number }
    totalCentavos: number
    devolvidoCentavos: number
  },
): Promise<number> {
  return comoDono(async (conexao) => {
    await conexao.query("begin")
    await conexao.query("select tests.entrar_como($1, 'aal1')", [usuarioId])
    const diferenca = dados.totalCentavos - dados.devolvidoCentavos
    const { rows } = await conexao.query(
      `select numero from public.registrar_venda(
         jsonb_build_array(jsonb_build_object('forma_venda_id', $1::uuid, 'quantidade', $2::int)), 0,
         case when $5::int > 0 then jsonb_build_array(jsonb_build_object('forma', 'dinheiro', 'valor_centavos', $5::int))
           else '[]'::jsonb end,
         $6::int, null,
         jsonb_build_array(jsonb_build_object('forma_venda_id', $3::uuid, 'quantidade', $4::int)), $7::int)`,
      [dados.leva.formaId, dados.leva.quantidade, dados.devolve.formaId, dados.devolve.quantidade, diferenca,
        dados.totalCentavos, dados.devolvidoCentavos],
    )
    await conexao.query("commit")
    return Number(rows[0].numero)
  })
}
