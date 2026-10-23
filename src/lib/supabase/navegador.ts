import { createBrowserClient } from "@supabase/ssr"

import { chavePublicavel, urlSupabase } from "./ambiente"
import type { Database } from "./tipos"

export function criarClienteNavegador() {
  return createBrowserClient<Database>(urlSupabase(), chavePublicavel())
}
