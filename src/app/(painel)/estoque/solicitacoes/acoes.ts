"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export async function decidirSolicitacao(id: number, aprovar: boolean): Promise<{ erro: string; sucesso: string }> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("decidir_solicitacao", { p_solicitacao: id, p_aprovar: aprovar })
  if (error) return { erro: mensagemDoErroDoBanco(error), sucesso: "" }

  // A aprovação muda o saldo: as páginas de estoque também precisam ser lidas de novo.
  revalidatePath("/estoque", "layout")
  return { erro: "", sucesso: MENSAGENS.salvo }
}
