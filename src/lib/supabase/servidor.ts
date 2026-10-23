import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { connection } from "next/server"

import { chavePublicavel, urlSupabase } from "./ambiente"
import type { Database } from "./tipos"

// Cliente com o login de quem está usando; as regras do banco (RLS) valem para ele.
export async function criarClienteServidor() {
  // O cliente do Supabase consulta o relógio ao nascer; só pode existir numa requisição de verdade.
  await connection()
  const cookieStore = await cookies()

  return createServerClient<Database>(urlSupabase(), chavePublicavel(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Chamado dentro de um Server Component, que não grava cookies; o proxy renova a sessão.
        }
      },
    },
  })
}
