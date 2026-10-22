// Apoio aos testes de tela: fala direto com o Supabase local do CI (nunca com a nuvem).
import { createClient } from "@supabase/supabase-js"

import type { Database } from "../../src/lib/supabase/tipos"

process.loadEnvFile(".env.local")

const CAIXA_DE_EMAILS = "http://127.0.0.1:54324"

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1")) {
  throw new Error("Os testes de tela só rodam contra o Supabase local.")
}

export type DadosUsuarioTeste = {
  email: string
  senha: string
  nome: string
  papel: "administrador" | "funcionario"
}

export async function criarUsuarioTeste(dados: DadosUsuarioTeste): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: dados.email,
    password: dados.senha,
    email_confirm: true,
    user_metadata: { nome: dados.nome },
  })
  if (error) throw error

  const id = data.user.id
  const { error: erroPapel } = await admin.from("usuarios").update({ papel: dados.papel }).eq("id", id)
  if (erroPapel) throw erroPapel
  return id
}

export async function limparUsuarios(): Promise<void> {
  const { error } = await admin.from("usuarios").delete().not("id", "is", null)
  if (error) throw error

  const { data, error: erroLista } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (erroLista) throw erroLista
  for (const usuario of data.users) {
    const { error: erroApagar } = await admin.auth.admin.deleteUser(usuario.id)
    if (erroApagar) throw erroApagar
  }

  await fetch(`${CAIXA_DE_EMAILS}/api/v1/messages`, { method: "DELETE" })
}

// Espera o e-mail chegar na caixa de testes e devolve o link para /auth/confirmar.
export async function ultimoLinkPorEmail(para: string): Promise<string> {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const busca = await fetch(
      `${CAIXA_DE_EMAILS}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`,
    ).then((r) => r.json() as Promise<{ messages: { ID: string }[] }>)

    const ultimo = busca.messages?.[0]
    if (ultimo) {
      const mensagem = await fetch(`${CAIXA_DE_EMAILS}/api/v1/message/${ultimo.ID}`).then(
        (r) => r.json() as Promise<{ HTML: string }>,
      )
      const link = /href="([^"]*\/auth\/confirmar[^"]*)"/.exec(mensagem.HTML)?.[1]
      if (link) return link.replaceAll("&amp;", "&")
    }
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  throw new Error(`Nenhum e-mail com link chegou para ${para}.`)
}
