import "server-only"

import { createClient } from "@supabase/supabase-js"

import { exigirVariavel, urlSupabase } from "./ambiente"
import type { Database } from "./tipos"

// Ignora as regras do banco: usar só no servidor e só para convite e bloqueio de login.
export function criarClienteAdmin() {
  return createClient<Database>(
    urlSupabase(),
    exigirVariavel(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
