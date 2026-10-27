// Apoio aos testes de concorrência: conexões de verdade com o banco local do CI, cada uma com a
// sua transação, para reproduzir duas abas ou dois cliques gravando ao mesmo tempo.
import { Client } from "pg"

const ENDERECO = process.env.BANCO_LOCAL_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

if (!["127.0.0.1", "localhost"].includes(new URL(ENDERECO).hostname)) {
  throw new Error("Os testes de concorrência só rodam contra o banco local.")
}

export const ADMINISTRADORA = "00000000-0000-0000-0000-00000000c0c0"

// Conexão do dono do banco, para preparar e conferir os dados (passa por cima das permissões).
export async function conectarComoDono(): Promise<Client> {
  const conexao = new Client({ connectionString: ENDERECO })
  await conexao.connect()
  return conexao
}

const abertas: Client[] = []
const pids = new WeakMap<Client, number>()

// Uma "aba": conexão própria, já numa transação agindo como a administradora com as duas etapas.
export async function abrirAba(): Promise<Client> {
  const conexao = await conectarComoDono()
  abertas.push(conexao)
  pids.set(conexao, (await conexao.query("select pg_backend_pid() as pid")).rows[0].pid)
  await conexao.query("begin")
  await conexao.query("select tests.entrar_como($1, 'aal2')", [ADMINISTRADORA])
  return conexao
}

// Fecha as abas do teste; a transação que ficou aberta é desfeita junto.
export async function fecharAbas(): Promise<void> {
  await Promise.all(abertas.splice(0).map((conexao) => conexao.end()))
}

export type Resultado = { ok: true; linhas: Record<string, unknown>[] } | { ok: false; erro: string }

// Manda o comando sem esperar a resposta. A promessa nunca falha: o erro do banco vira { ok: false }.
export function enviar(conexao: Client, sql: string, valores: unknown[] = []): Promise<Resultado> {
  return conexao.query(sql, valores).then(
    (resposta): Resultado => ({ ok: true, linhas: resposta.rows }),
    (erro: Error): Resultado => ({ ok: false, erro: erro.message }),
  )
}

// Espera o comando enviado terminar ou ficar parado esperando a transação da outra aba.
// Sem isso, a outra aba poderia confirmar antes de o comando chegar ao banco e o teste não provaria nada.
export async function esperarTerminarOuTravar(conexao: Client, pendente: Promise<Resultado>): Promise<void> {
  const observador = await conectarComoDono()
  let terminou = false
  void pendente.then(() => {
    terminou = true
  })
  try {
    for (let tentativa = 0; tentativa < 200; tentativa++) {
      if (terminou) return
      const { rows } = await observador.query("select wait_event_type from pg_stat_activity where pid = $1", [
        pids.get(conexao),
      ])
      if (rows[0]?.wait_event_type === "Lock") return
      await new Promise((resolver) => setTimeout(resolver, 25))
    }
    throw new Error("O comando não terminou nem ficou esperando a outra aba.")
  } finally {
    await observador.end()
  }
}

// Confirma se o comando deu certo e desfaz se deu erro, para o teste conferir o que ficou gravado.
export async function terminar(conexao: Client, resultado: Resultado): Promise<void> {
  await conexao.query(resultado.ok ? "commit" : "rollback")
}

export async function prepararAdministradora(dono: Client): Promise<void> {
  await dono.query(
    "insert into auth.users (id, email) values ($1, 'concorrencia@loja.test') on conflict (id) do nothing",
    [ADMINISTRADORA],
  )
  await dono.query("update public.usuarios set papel = 'administrador', ativo = true where id = $1", [ADMINISTRADORA])
}

export async function removerAdministradora(dono: Client): Promise<void> {
  await dono.query("delete from public.usuarios where id = $1", [ADMINISTRADORA])
  await dono.query("delete from auth.users where id = $1", [ADMINISTRADORA])
}

// Apaga o estoque e todo o catálogo (filhos antes dos pais), como os testes de tela fazem.
// O estoque sai com truncate, que não passa pelo gatilho que impede apagar movimentações.
export async function limparCatalogo(dono: Client): Promise<void> {
  await dono.query(`
    truncate public.movimentacoes_custos, public.movimentacoes, public.solicitacoes_ajuste, public.saldos,
      public.lotes, public.custos_variacao, public.verificacoes_integridade restart identity cascade;
    delete from public.faixas_preco;
    delete from public.formas_venda;
    delete from public.fotos;
    delete from public.compatibilidades;
    delete from public.variacoes;
    delete from public.produto_categorias;
    delete from public.produto_etiquetas;
    delete from public.produtos;
  `)
}

export async function criarProduto(
  dono: Client,
  tipo: "unidade" | "peso" = "unidade",
): Promise<{ produtoId: string; variacaoId: string }> {
  const produto = await dono.query("insert into public.produtos (nome, tipo_venda) values ('Teste', $1) returning id", [
    tipo,
  ])
  const produtoId: string = produto.rows[0].id
  const variacao = await dono.query("insert into public.variacoes (produto_id, nome) values ($1, 'Padrão') returning id", [
    produtoId,
  ])
  return { produtoId, variacaoId: variacao.rows[0].id }
}
