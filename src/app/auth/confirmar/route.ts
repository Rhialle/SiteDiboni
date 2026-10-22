import type { EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { caminhoSeguro } from "@/lib/auth/caminho-seguro"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Recebe o link dos e-mails de convite e de recuperação de senha.
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams
  const tokenHash = parametros.get("token_hash")
  const tipo = parametros.get("type") as EmailOtpType | null
  const destino = caminhoSeguro(parametros.get("next"), "/redefinir-senha")

  if (tokenHash && tipo) {
    const supabase = await criarClienteServidor()
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    if (!error) redirect(destino)
  }

  redirect("/entrar?motivo=link-invalido")
}
