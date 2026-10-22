"use server"

import { redirect } from "next/navigation"

import { MENSAGENS } from "@/lib/auth/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type EstadoEntrar = { erro: string }

export async function entrar(_estado: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const senha = String(formData.get("senha") ?? "")

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) {
    return { erro: error.code === "user_banned" ? MENSAGENS.desativado : MENSAGENS.credenciais }
  }

  // O painel manda o administrador para as duas etapas, se ainda não fez.
  redirect("/inicio")
}

export async function sair(): Promise<void> {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut({ scope: "local" })
  redirect("/entrar")
}
