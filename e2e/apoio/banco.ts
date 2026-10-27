// Acesso direto ao banco local do CI, como dono, para o que o site não deixa fazer:
// limpar o estoque (movimentações não se apagam) e simular situações nos testes.
import { Client } from "pg"

const ENDERECO = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

export const TABELAS_DO_ESTOQUE = [
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
}): Promise<void> {
  await comoDono((conexao) =>
    conexao.query(
      `insert into public.solicitacoes_ajuste (variacao_id, lote_id, tipo, quantidade, motivo, solicitado_por)
       values ($1, public.lote_geral($1), 'perda_avaria', $2, $3, $4)`,
      [dados.variacaoId, dados.quantidade, dados.motivo, dados.solicitadoPor],
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

// O truncate não passa pelo gatilho que impede apagar movimentações.
export async function limparEstoque(): Promise<void> {
  await comoDono((conexao) => conexao.query(`truncate ${TABELAS_DO_ESTOQUE} restart identity cascade`))
}
