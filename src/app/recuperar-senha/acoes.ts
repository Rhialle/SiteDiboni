"use server"

import { origemDaRequisicao } from "@/lib/origem"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type EstadoRecuperacao = { enviado: boolean }

// Responde sempre igual, exista ou não o e-mail, para ninguém descobrir quem tem conta.
export async function pedirRecuperacao(
  _estado: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const supabase = await criarClienteServidor()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origemDaRequisicao()}/auth/confirmar?next=/redefinir-senha`,
  })
  return { enviado: true }
}
