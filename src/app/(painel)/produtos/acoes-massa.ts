"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { lerPercentual } from "@/lib/catalogo/percentual"
import { MENSAGENS, mensagemReajuste } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type ResultadoMassa = { erro: string; sucesso: string }

function resultado(erro: { code?: string; message: string } | null, sucesso: string): ResultadoMassa {
  if (erro) return { erro: mensagemDoErroDoBanco(erro), sucesso: "" }
  revalidatePath("/produtos")
  return { erro: "", sucesso }
}

export async function reajustarEmMassa(ids: string[], percentualTexto: string): Promise<ResultadoMassa> {
  await exigirAdministrador()
  if (ids.length === 0) return { erro: MENSAGENS.nenhumSelecionado, sucesso: "" }
  let percentual: number
  try {
    percentual = lerPercentual(percentualTexto)
  } catch {
    return { erro: MENSAGENS.percentualInvalido, sucesso: "" }
  }

  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc("reajustar_precos", { p_produtos: ids, p_percentual: percentual })
  return resultado(error, mensagemReajuste(data ?? 0))
}

export async function categoriaEmMassa(ids: string[], categoriaId: string, incluir: boolean): Promise<ResultadoMassa> {
  await exigirAdministrador()
  if (ids.length === 0) return { erro: MENSAGENS.nenhumSelecionado, sucesso: "" }
  if (!categoriaId) return { erro: "Escolha a categoria.", sucesso: "" }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("alterar_categoria_em_massa", {
    p_produtos: ids,
    p_categoria: categoriaId,
    p_incluir: incluir,
  })
  return resultado(error, MENSAGENS.salvo)
}

export async function inativarEmMassa(ids: string[], inativo: boolean): Promise<ResultadoMassa> {
  await exigirAdministrador()
  if (ids.length === 0) return { erro: MENSAGENS.nenhumSelecionado, sucesso: "" }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("alterar_inativo_em_massa", { p_produtos: ids, p_inativo: inativo })
  return resultado(error, MENSAGENS.salvo)
}
