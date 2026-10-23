import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { criarClienteServidor } from "@/lib/supabase/servidor"

// Usado quando o usuário foi desativado com a sessão aberta: apaga a sessão e explica o motivo.
export async function GET(request: NextRequest) {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut({ scope: "local" })

  const desativado = request.nextUrl.searchParams.get("motivo") === "desativado"
  redirect(desativado ? "/entrar?motivo=desativado" : "/entrar")
}
