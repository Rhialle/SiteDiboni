import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { criarClienteServidor } from "@/lib/supabase/servidor"

export type Papel = "administrador" | "funcionario"

export type UsuarioSessao = {
  id: string
  nome: string
  email: string
  papel: Papel
  nivel: "aal1" | "aal2"
}

type EstadoSessao =
  | { tipo: "sem-sessao" }
  | { tipo: "inativo" }
  | { tipo: "ativo"; usuario: UsuarioSessao }

// Uma leitura por requisição, mesmo que layout e página perguntem.
const lerSessao = cache(async (): Promise<EstadoSessao> => {
  const supabase = await criarClienteServidor()

  // A sessão é assinada com chave assimétrica: o próprio servidor confere a assinatura,
  // sem ir ao servidor de login. O nível de duas etapas vem dentro dela.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return { tipo: "sem-sessao" }

  // Toda conta tem linha em usuarios, e o banco esconde a linha de quem está desativado:
  // é aqui que a desativação aparece, na mesma hora.
  const { data: linha } = await supabase
    .from("usuarios")
    .select("id, nome, email, papel")
    .eq("id", claims.sub)
    .maybeSingle()
  if (!linha) return { tipo: "inativo" }

  return {
    tipo: "ativo",
    usuario: { ...linha, nivel: claims.aal === "aal2" ? "aal2" : "aal1" },
  }
})

export async function obterUsuarioSessao(): Promise<UsuarioSessao | null> {
  const estado = await lerSessao()
  return estado.tipo === "ativo" ? estado.usuario : null
}

export async function exigirUsuario(): Promise<UsuarioSessao> {
  const estado = await lerSessao()
  if (estado.tipo === "sem-sessao") redirect("/entrar")
  // /sair apaga a sessão antes de mostrar a mensagem de desativado.
  if (estado.tipo === "inativo") redirect("/sair?motivo=desativado")
  return estado.usuario
}

export async function exigirAdministrador(): Promise<UsuarioSessao> {
  const usuario = await exigirUsuario()
  if (usuario.papel !== "administrador") redirect("/sem-permissao")
  if (usuario.nivel !== "aal2") redirect("/entrar/duas-etapas")
  return usuario
}
