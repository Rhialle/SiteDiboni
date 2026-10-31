"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador, exigirUsuario } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { unidadesDeDigitacao } from "@/lib/estoque/quantidade"
import { somarContagem } from "@/lib/inventario/contagem"
import { MENSAGENS, mensagemInventarioAprovado } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Devolve o que foi digitado quando há erro (o React limpa o formulário depois da ação).
export type EstadoContagem = { erro: string; sucesso: string; valores: Record<string, string> | null }

export async function contarItem(
  inventarioId: number,
  variacaoId: string,
  loteId: string | null,
  _estado: EstadoContagem,
  formData: FormData,
): Promise<EstadoContagem> {
  await exigirUsuario()
  const valores = Object.fromEntries([...formData.entries()].map(([chave, valor]) => [chave, String(valor)]))
  const falha = (erro: string): EstadoContagem => ({ erro, sucesso: "", valores })

  // As unidades vêm do banco, não do navegador: o fator usado na soma é sempre o da forma de venda.
  const supabase = await criarClienteServidor()
  const [{ data: variacao }, { data: formas }] = await Promise.all([
    supabase.from("variacoes").select("produtos(tipo_venda)").eq("id", variacaoId).maybeSingle(),
    supabase.from("formas_venda").select("id, nome, fator, peso_variavel, ativa").eq("variacao_id", variacaoId),
  ])
  if (!variacao) return falha(MENSAGENS.itemNaoExiste)
  const campos = Object.fromEntries(
    Object.entries(valores)
      .filter(([chave]) => chave.startsWith("q:"))
      .map(([chave, texto]) => [chave.slice(2), texto]),
  )
  const soma = somarContagem(campos, unidadesDeDigitacao(variacao.produtos.tipo_venda, formas ?? []))
  if (!soma.ok) return falha(soma.erro)

  const { error } = await supabase.rpc("contar_item", {
    p_inventario: inventarioId,
    p_variacao: variacaoId,
    p_lote: loteId as string,
    p_quantidade: soma.total,
    p_validade: (valores.validade || null) as string,
    p_codigo_lote: (valores.codigo || null) as string,
  })
  if (error) return falha(mensagemDoErroDoBanco(error))

  revalidatePath(`/inventario/${inventarioId}`)
  return { erro: "", sucesso: MENSAGENS.contagemSalva, valores: null }
}


export type ResultadoDoInventario = { erro: string; sucesso: string }

// As ações do administrador sobre o inventário inteiro: a função do banco confere a situação.
async function mudarInventario(
  inventarioId: number,
  funcao: "encerrar_contagem" | "reabrir_contagem" | "cancelar_inventario",
  sucesso: string,
): Promise<ResultadoDoInventario> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc(funcao, { p_inventario: inventarioId })
  if (error) return { erro: mensagemDoErroDoBanco(error), sucesso: "" }
  revalidatePath(`/inventario/${inventarioId}`)
  revalidatePath("/inventario")
  return { erro: "", sucesso }
}

export async function encerrarContagem(inventarioId: number): Promise<ResultadoDoInventario> {
  return mudarInventario(inventarioId, "encerrar_contagem", MENSAGENS.contagemEncerrada)
}

export async function reabrirContagem(inventarioId: number): Promise<ResultadoDoInventario> {
  return mudarInventario(inventarioId, "reabrir_contagem", MENSAGENS.contagemReaberta)
}

export async function cancelarInventario(inventarioId: number): Promise<ResultadoDoInventario> {
  return mudarInventario(inventarioId, "cancelar_inventario", MENSAGENS.inventarioCancelado)
}

export async function aprovarInventario(inventarioId: number): Promise<ResultadoDoInventario> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { data: ajustes, error } = await supabase.rpc("aprovar_inventario", { p_inventario: inventarioId })
  if (error) return { erro: mensagemDoErroDoBanco(error), sucesso: "" }
  for (const caminho of [`/inventario/${inventarioId}`, "/inventario", "/estoque", "/alertas", "/inicio"]) revalidatePath(caminho)
  return { erro: "", sucesso: mensagemInventarioAprovado(ajustes ?? 0) }
}
