"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export async function estornar(id: number, motivo: string): Promise<{ erro: string; sucesso: string }> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("estornar_movimentacao", { p_movimentacao: id, p_motivo: motivo })
  if (error) return { erro: mensagemDoErroDoBanco(error), sucesso: "" }

  // O estorno muda o saldo: as páginas de estoque também precisam ser lidas de novo.
  revalidatePath("/estoque", "layout")
  return { erro: "", sucesso: MENSAGENS.estornoRegistrado }
}
