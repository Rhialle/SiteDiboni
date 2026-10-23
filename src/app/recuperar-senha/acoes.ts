"use server"

import { origemDaRequisicao } from "@/lib/origem"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import { normalizarEmail } from "@/lib/validacao/email"

export type EstadoRecuperacao = { enviado: boolean }

// Responde sempre igual, exista ou não o e-mail, para ninguém descobrir quem tem conta.
export async function pedirRecuperacao(
  _estado: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  const email = normalizarEmail(String(formData.get("email") ?? ""))
  const supabase = await criarClienteServidor()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origemDaRequisicao()}/auth/confirmar?next=/redefinir-senha`,
  })
  return { enviado: true }
}
