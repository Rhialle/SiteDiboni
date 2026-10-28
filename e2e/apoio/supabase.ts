// Apoio aos testes de tela: fala direto com o Supabase local do CI (nunca com a nuvem).
import { createClient } from "@supabase/supabase-js"

import type { Database } from "../../src/lib/supabase/tipos"

import { limparEstoque } from "./banco"

process.loadEnvFile(".env.local")

const CAIXA_DE_EMAILS = "http://127.0.0.1:54324"

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1")) {
  throw new Error("Os testes de tela só rodam contra o Supabase local.")
}

export type DadosUsuarioTeste = {
  email: string
  senha: string
  nome: string
  papel: "administrador" | "funcionario"
}

export async function criarUsuarioTeste(dados: DadosUsuarioTeste): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: dados.email,
    password: dados.senha,
    email_confirm: true,
    user_metadata: { nome: dados.nome },
  })
  if (error) throw error

  const id = data.user.id
  const { error: erroPapel } = await admin.from("usuarios").update({ papel: dados.papel }).eq("id", id)
  if (erroPapel) throw erroPapel
  return id
}

export async function limparUsuarios(): Promise<void> {
  const { error } = await admin.from("usuarios").delete().not("id", "is", null)
  if (error) throw error

  const { data, error: erroLista } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (erroLista) throw erroLista
  for (const usuario of data.users) {
    const { error: erroApagar } = await admin.auth.admin.deleteUser(usuario.id)
    if (erroApagar) throw erroApagar
  }

  await fetch(`${CAIXA_DE_EMAILS}/api/v1/messages`, { method: "DELETE" })
}

// Espera o e-mail chegar na caixa de testes e devolve o link para /auth/confirmar.
export async function ultimoLinkPorEmail(para: string): Promise<string> {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const busca = await fetch(
      `${CAIXA_DE_EMAILS}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`,
    ).then((r) => r.json() as Promise<{ messages: { ID: string }[] }>)

    const ultimo = busca.messages?.[0]
    if (ultimo) {
      const mensagem = await fetch(`${CAIXA_DE_EMAILS}/api/v1/message/${ultimo.ID}`).then(
        (r) => r.json() as Promise<{ HTML: string }>,
      )
      const link = /href="([^"]*\/auth\/confirmar[^"]*)"/.exec(mensagem.HTML)?.[1]
      if (link) return link.replaceAll("&amp;", "&")
    }
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  throw new Error(`Nenhum e-mail com link chegou para ${para}.`)
}

export async function restaurarConfiguracoes(): Promise<void> {
  const { error } = await admin
    .from("configuracoes")
    .update({ cnpj_loja: null, limite_ajuste_centavos: 5000, dias_alerta_validade: [30, 15, 7] })
    .eq("id", 1)
  if (error) throw error
}

export async function lerConfiguracoes() {
  const { data, error } = await admin.from("configuracoes").select("*").eq("id", 1).single()
  if (error) throw error
  return data
}

// Apaga o estoque e todo o catálogo (filhos antes dos pais) e as fotos do bucket.
export async function limparCatalogo(): Promise<void> {
  await limparEstoque()
  const tudo = <T extends string>(tabela: T) => admin.from(tabela as never).delete().not("id" as never, "is", null)
  for (const tabela of ["faixas_preco", "formas_venda", "compatibilidades", "fotos", "variacoes"] as const) {
    const { error } = await tudo(tabela)
    if (error) throw error
  }
  for (const tabela of ["produto_categorias", "produto_etiquetas"] as const) {
    const { error } = await admin.from(tabela).delete().not("produto_id", "is", null)
    if (error) throw error
  }
  for (const tabela of ["produtos", "etiquetas"] as const) {
    const { error } = await tudo(tabela)
    if (error) throw error
  }
  // Categorias apontam para a mãe com RESTRICT: apaga das folhas para a raiz.
  for (let rodada = 0; rodada < 10; rodada++) {
    const { data: categorias } = await admin.from("categorias").select("id, categoria_pai_id")
    if (!categorias?.length) break
    const maes = new Set(categorias.map((c) => c.categoria_pai_id).filter(Boolean))
    const folhas = categorias.filter((c) => !maes.has(c.id)).map((c) => c.id)
    const { error } = await admin.from("categorias").delete().in("id", folhas)
    if (error) throw error
  }
  // XMLs das notas: ficam na raiz do bucket.
  const { data: xmls } = await admin.storage.from("notas-xml").list("", { limit: 1000 })
  if (xmls?.length) await admin.storage.from("notas-xml").remove(xmls.map((x) => x.name))
  const { data: pastas } = await admin.storage.from("fotos-produtos").list("", { limit: 1000 })
  for (const pasta of pastas ?? []) {
    const { data: arquivos } = await admin.storage.from("fotos-produtos").list(pasta.name, { limit: 1000 })
    const caminhos = (arquivos ?? []).map((a) => `${pasta.name}/${a.name}`)
    if (caminhos.length) await admin.storage.from("fotos-produtos").remove(caminhos)
  }
}

export async function criarCategoriaTeste(nome: string, paiId: string | null = null): Promise<string> {
  const { data, error } = await admin
    .from("categorias")
    .insert({ nome, categoria_pai_id: paiId })
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

// Cria direto nas tabelas (o cliente de serviço não passa pela checagem de administrador de criar_produto).
export async function criarProdutoTeste(dados: {
  nome: string
  tipo_venda?: "unidade" | "peso"
  controla_validade?: boolean
  categorias?: string[]
  variacao?: { nome?: string; codigo_barras?: string; codigo_interno?: string }
}): Promise<{ produtoId: string; variacaoId: string }> {
  const { data: produto, error } = await admin
    .from("produtos")
    .insert({
      nome: dados.nome,
      tipo_venda: dados.tipo_venda ?? "unidade",
      controla_validade: dados.controla_validade ?? false,
    })
    .select("id")
    .single()
  if (error) throw error
  const { data: variacao, error: erroVariacao } = await admin
    .from("variacoes")
    .insert({
      produto_id: produto.id,
      nome: dados.variacao?.nome ?? "Padrão",
      codigo_barras: dados.variacao?.codigo_barras ?? null,
      ...(dados.variacao?.codigo_interno ? { codigo_interno: dados.variacao.codigo_interno } : {}),
    })
    .select("id")
    .single()
  if (erroVariacao) throw erroVariacao
  if (dados.categorias?.length) {
    const { error: erroCategorias } = await admin
      .from("produto_categorias")
      .insert(dados.categorias.map((categoria_id) => ({ produto_id: produto.id, categoria_id })))
    if (erroCategorias) throw erroCategorias
  }
  return { produtoId: produto.id, variacaoId: variacao.id }
}

export async function criarFormaTeste(
  variacaoId: string,
  forma: { nome: string; fator: number; preco_centavos: number; peso_variavel?: boolean },
): Promise<string> {
  const { data, error } = await admin
    .from("formas_venda" as never)
    .insert({ variacao_id: variacaoId, peso_variavel: false, ...forma } as never)
    .select("id")
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function prepararProdutoCompleto(dados: { nome: string; categoria: string }) {
  const { data: categoria, error: erroCategoria } = await admin
    .from("categorias")
    .insert({ nome: dados.categoria })
    .select("id")
    .single()
  if (erroCategoria) throw erroCategoria
  const produto = await criarProdutoTeste({ nome: dados.nome, categorias: [categoria.id] })
  const { error: erroNcm } = await admin.from("produtos").update({ ncm: "48191000" }).eq("id", produto.produtoId)
  if (erroNcm) throw erroNcm
  await criarFormaTeste(produto.variacaoId, { nome: "Unidade", fator: 1, preco_centavos: 250 })
  return produto
}

// Linhas em "fotos" (sem arquivo de verdade no bucket), para testar limites e situação.
export async function criarFotosTeste(produtoId: string, quantidade: number): Promise<void> {
  const { error } = await admin.from("fotos").insert(
    Array.from({ length: quantidade }, (_, i) => ({ produto_id: produtoId, caminho: `${produtoId}/teste-${i}.jpg`, ordem: i })),
  )
  if (error) throw error
}

export async function codigoInternoDe(variacaoId: string): Promise<string> {
  const { data, error } = await admin.from("variacoes").select("codigo_interno").eq("id", variacaoId).single()
  if (error) throw error
  return data.codigo_interno
}

export async function criarFaixaTeste(formaId: string, quantidadeMinima: number, precoCentavos: number): Promise<void> {
  const { error } = await admin
    .from("faixas_preco")
    .insert({ forma_venda_id: formaId, quantidade_minima: quantidadeMinima, preco_centavos: precoCentavos })
  if (error) throw error
}

// Data AAAA-MM-DD em São Paulo, daqui a tantos dias (negativo = no passado).
export function dataDaqui(dias: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
  )
}

// Entrada direta pela função interna do estoque (o cliente de serviço pode chamá-la).
// Aceita validade no passado, para testar lote vencido.
export async function criarEstoqueTeste(
  variacaoId: string,
  dados: { quantidade: number; custo: number; usuarioId: string; validade?: string; codigo?: string },
): Promise<number> {
  const { data, error } = await admin.rpc("entrar_no_estoque", {
    p_variacao: variacaoId,
    p_quantidade: dados.quantidade,
    p_custo_unitario: dados.custo,
    p_validade: (dados.validade ?? null) as string,
    p_codigo_lote: (dados.codigo ?? null) as string,
    p_tipo: "entrada_manual",
    p_motivo: "estoque de teste",
    p_usuario: dados.usuarioId,
  })
  if (error) throw error
  return data
}

export async function definirEstoqueMinimo(variacaoId: string, minimo: number): Promise<void> {
  const { error } = await admin.from("variacoes").update({ estoque_minimo: minimo }).eq("id", variacaoId)
  if (error) throw error
}

// Muitos produtos de uma vez (sem variação), para testar a paginação da lista.
export async function criarProdutosEmLote(nomes: string[]): Promise<void> {
  const { error } = await admin.from("produtos").insert(nomes.map((nome) => ({ nome, tipo_venda: "unidade" as const })))
  if (error) throw error
}

export async function nomesDosProdutosInativos(): Promise<string[]> {
  const { data, error } = await admin.from("produtos").select("nome").eq("inativo", true).order("nome")
  if (error) throw error
  return data.map((p) => p.nome)
}

export async function nomeDoProduto(produtoId: string): Promise<string> {
  const { data, error } = await admin.from("produtos").select("nome").eq("id", produtoId).single()
  if (error) throw error
  return data.nome
}

export async function apagarCategoriaTeste(categoriaId: string): Promise<void> {
  const { error } = await admin.from("categorias").delete().eq("id", categoriaId)
  if (error) throw error
}

export async function formasDoProduto(produtoId: string): Promise<string[]> {
  const { data: variacoes, error } = await admin.from("variacoes").select("id").eq("produto_id", produtoId)
  if (error) throw error
  const { data: formas, error: erroFormas } = await admin
    .from("formas_venda")
    .select("nome")
    .in("variacao_id", variacoes.map((v) => v.id))
  if (erroFormas) throw erroFormas
  return formas.map((f) => f.nome)
}
