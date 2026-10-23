"use server"

import { redirect } from "next/navigation"

import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type EstadoRedefinicao = { erro: string }

const ERROS: Record<string, string> = {
  weak_password: MENSAGENS.senhaCurta,
  same_password: MENSAGENS.senhaIgual,
}

export async function salvarSenha(
  _estado: EstadoRedefinicao,
  formData: FormData,
): Promise<EstadoRedefinicao> {
  const senha = String(formData.get("senha") ?? "")
  if (senha.length < 8) return { erro: MENSAGENS.senhaCurta }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) return { erro: (error.code && ERROS[error.code]) || MENSAGENS.senhaFalhou }

  redirect("/inicio")
}
