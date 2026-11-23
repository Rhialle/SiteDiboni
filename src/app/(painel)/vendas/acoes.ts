"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type EstadoVenda = { erro: string; sucesso: string }

export async function cancelarVenda(
  vendaId: number,
  numero: number,
  _estado: EstadoVenda,
  formData: FormData,
): Promise<EstadoVenda> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("cancelar_venda", { p_venda: vendaId, p_motivo: String(formData.get("motivo") ?? "") })
  if (error) return { erro: mensagemDoErroDoBanco(error), sucesso: "" }
  for (const caminho of [`/vendas/${numero}`, "/vendas", "/vendas/sem-saldo", "/caixa", "/estoque", "/inicio"]) revalidatePath(caminho)
  return { erro: "", sucesso: MENSAGENS.vendaCancelada }
}

export async function conferirVendaSemSaldo(itemId: number): Promise<EstadoVenda> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("conferir_venda_sem_saldo", { p_item: itemId })
  if (error) return { erro: mensagemDoErroDoBanco(error), sucesso: "" }
  revalidatePath("/vendas/sem-saldo")
  revalidatePath("/inicio")
  return { erro: "", sucesso: MENSAGENS.semSaldoConferido }
}
