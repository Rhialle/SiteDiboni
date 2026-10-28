"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { gtinValido } from "@/lib/catalogo/gtin"
import { colunasDoProduto, problemaDosCamposDoProduto, type CamposDoProduto } from "@/lib/catalogo/produto-form"
import { MENSAGENS, mensagemFatorNaoInteiro } from "@/lib/mensagens"
import { daInteiro, lerFator, quantidadeDaNota } from "@/lib/notas/fator"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Devolve o que foi digitado quando há erro (o React limpa o formulário depois da ação).
export type EstadoLigacao = { erro: string; sucesso: string; valores: Record<string, string> | null }

type Supabase = Awaited<ReturnType<typeof criarClienteServidor>>

function lerCampos(formData: FormData, campos: string[]): Record<string, string> {
  return Object.fromEntries(campos.map((campo) => [campo, String(formData.get(campo) ?? "").trim()]))
}

// Só números: tenta primeiro o código de barras; senão (ou se não achar), o código interno.
async function variacaoPeloCodigo(supabase: Supabase, codigo: string): Promise<string | null> {
  if (/^\d+$/.test(codigo)) {
    const { data } = await supabase.from("variacoes").select("id").eq("codigo_barras", codigo).maybeSingle()
    if (data) return data.id
  }
  const { data } = await supabase.rpc("variacao_por_codigo", { p_codigo: codigo })
  return data ?? null
}

function revalidarNota(notaId: string) {
  revalidatePath(`/notas/${notaId}`)
  revalidatePath("/notas")
}

export async function ligarItem(
  notaId: string,
  itemId: string,
  _estado: EstadoLigacao,
  formData: FormData,
): Promise<EstadoLigacao> {
  await exigirAdministrador()
  const valores = lerCampos(formData, ["codigo", "fator"])
  const falha = (erro: string): EstadoLigacao => ({ erro, sucesso: "", valores })

  const fator = lerFator(valores.fator)
  if (fator === null) return falha(MENSAGENS.fatorInvalido)
  const supabase = await criarClienteServidor()
  const variacaoId = valores.codigo ? await variacaoPeloCodigo(supabase, valores.codigo) : null
  if (!variacaoId) return falha(MENSAGENS.codigoNaoEncontrado)

  // O banco confere a R6 e liga também os outros itens da nota com o mesmo código e unidade.
  const { error } = await supabase.rpc("ligar_item_nota", { p_item: itemId, p_variacao: variacaoId, p_fator: fator })
  if (error) return falha(mensagemDoErroDoBanco(error))

  revalidarNota(notaId)
  return { erro: "", sucesso: MENSAGENS.itemLigado, valores: null }
}

// Cria o produto com o que veio do XML (e o que a pessoa ajustou) e liga o item a ele.
export async function criarProdutoDoItem(
  notaId: string,
  itemId: string,
  _estado: EstadoLigacao,
  formData: FormData,
): Promise<EstadoLigacao> {
  await exigirAdministrador()
  const valores = lerCampos(formData, ["nome", "tipo_venda", "ncm", "codigo_barras", "fator"])
  const controlaValidade = formData.get("controla_validade") === "on"
  const falha = (erro: string): EstadoLigacao => ({
    erro,
    sucesso: "",
    valores: { ...valores, controla_validade: controlaValidade ? "on" : "" },
  })

  const campos: CamposDoProduto = {
    nome: valores.nome,
    descricao: "",
    tipo_venda: valores.tipo_venda === "peso" ? "peso" : "unidade",
    ncm: valores.ncm.replace(/\D/g, ""),
    cest: "",
    origem_fiscal: "",
    categorias: [],
    etiquetas: [],
    marcados: controlaValidade ? ["controla_validade"] : [],
  }
  const codigoBarras = valores.codigo_barras.replace(/\D/g, "")
  if (!campos.nome) return falha(MENSAGENS.nomeObrigatorio)
  const problema = problemaDosCamposDoProduto(campos)
  if (problema) return falha(problema)
  if (codigoBarras && !gtinValido(codigoBarras)) return falha(MENSAGENS.codigoBarrasInvalido)
  const fator = lerFator(valores.fator)
  if (fator === null) return falha(MENSAGENS.fatorInvalido)

  // A R6 antes de criar o produto: se o fator não servir, nenhum produto fica criado à toa.
  const supabase = await criarClienteServidor()
  const { data: item } = await supabase
    .from("notas_entrada_itens")
    .select("numero_item, descricao, unidade, quantidade_nota, rastro")
    .eq("id", itemId)
    .maybeSingle()
  if (!item) return falha(MENSAGENS.itemNaoExiste)
  const lotes = controlaValidade ? ((item.rastro ?? []) as { quantidade: string }[]) : []
  const quantidades = [String(item.quantidade_nota), ...lotes.map((lote) => lote.quantidade)]
  const errada = quantidades.find((quantidade) => !daInteiro(quantidade, fator))
  if (errada !== undefined) {
    const dados = { numero: item.numero_item, descricao: item.descricao, unidade: item.unidade }
    return falha(mensagemFatorNaoInteiro(dados, quantidadeDaNota(errada), fator))
  }

  const { data: produtoId, error } = await supabase.rpc("criar_produto", {
    dados: {
      ...colunasDoProduto(campos),
      categorias: [],
      etiquetas: [],
      variacao: { nome: "", codigo_interno: "", codigo_barras: codigoBarras },
    },
  })
  if (error) return falha(mensagemDoErroDoBanco(error))
  const { data: variacao } = await supabase.from("variacoes").select("id").eq("produto_id", produtoId).single()
  if (!variacao) return falha(MENSAGENS.acaoFalhou)

  const { error: erroLigacao } = await supabase.rpc("ligar_item_nota", {
    p_item: itemId,
    p_variacao: variacao.id,
    p_fator: fator,
  })
  // Raro (a nota foi confirmada em outra aba): o produto já existe, então não pode ser criado de novo.
  if (erroLigacao) return falha(`${mensagemDoErroDoBanco(erroLigacao)} ${MENSAGENS.produtoCriadoSemLigacao}`)

  revalidarNota(notaId)
  revalidatePath("/produtos")
  return { erro: "", sucesso: MENSAGENS.produtoCriadoELigado, valores: null }
}
