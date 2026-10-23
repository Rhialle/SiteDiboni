import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { chavePublicavel, supabaseConfigurado, urlSupabase } from "./ambiente"

// Renova a sessão do Supabase a cada requisição e devolve os cookies novos.
export async function atualizarSessao(request: NextRequest): Promise<NextResponse> {
  let resposta = NextResponse.next({ request })

  // Sem as chaves (ex.: pré-visualização antes da configuração), não há sessão para renovar.
  if (!supabaseConfigurado()) return resposta

  const supabase = createServerClient(urlSupabase(), chavePublicavel(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesParaGravar, cabecalhos) {
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value))
        resposta = NextResponse.next({ request })
        cookiesParaGravar.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options),
        )
        Object.entries(cabecalhos ?? {}).forEach(([nome, valor]) =>
          resposta.headers.set(nome, valor),
        )
      },
    },
  })

  await supabase.auth.getClaims()
  return resposta
}
