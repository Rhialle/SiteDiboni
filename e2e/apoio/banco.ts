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

// O truncate não passa pelo gatilho que impede apagar movimentações.
export async function limparEstoque(): Promise<void> {
  await comoDono((conexao) => conexao.query(`truncate ${TABELAS_DO_ESTOQUE} restart identity cascade`))
}
