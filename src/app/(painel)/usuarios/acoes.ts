"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador, type Papel } from "@/lib/auth/sessao"
import { MENSAGENS, mensagemConviteEnviado } from "@/lib/mensagens"
import { origemDaRequisicao } from "@/lib/origem"
import { criarClienteAdmin } from "@/lib/supabase/admin"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import { normalizarEmail } from "@/lib/validacao/email"

export type EstadoConvite = {
  erro: string
  sucesso: string
  valores: { nome: string; email: string; papel: Papel }
}

export type ResultadoAcao = { erro: string }

// Erro P0001 é a mensagem do próprio banco (ex.: regra do último administrador).
function mensagemDoBanco(erro: { code?: string; message: string }): string {
  return erro.code === "P0001" ? erro.message : MENSAGENS.acaoFalhou
}

export async function convidarUsuario(
  _estado: EstadoConvite,
  formData: FormData,
): Promise<EstadoConvite> {
  await exigirAdministrador()

  const valores = {
    nome: String(formData.get("nome") ?? "").trim(),
    email: normalizarEmail(String(formData.get("email") ?? "")),
    papel: (formData.get("papel") === "administrador" ? "administrador" : "funcionario") as Papel,
  }
  const falha = (erro: string): EstadoConvite => ({ erro, sucesso: "", valores })

  if (!valores.nome) return falha(MENSAGENS.nomeObrigatorio)

  const supabase = await criarClienteServidor()
  const { data: existente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", valores.email)
    .maybeSingle()
  if (existente) return falha(MENSAGENS.emailRepetido)

  const { data, error } = await criarClienteAdmin().auth.admin.inviteUserByEmail(valores.email, {
    data: { nome: valores.nome },
    redirectTo: `${await origemDaRequisicao()}/auth/confirmar?next=/redefinir-senha`,
  })
  if (error) {
    return falha(error.code === "email_exists" ? MENSAGENS.emailRepetido : MENSAGENS.conviteFalhou)
  }

  // Todo convidado nasce funcionário; o papel de administrador é dado com o login de quem convidou.
  if (valores.papel === "administrador") {
    const { error: erroPapel } = await supabase
      .from("usuarios")
      .update({ papel: "administrador" })
      .eq("id", data.user.id)
    if (erroPapel) return falha(mensagemDoBanco(erroPapel))
  }

  revalidatePath("/usuarios")
  return {
    erro: "",
    sucesso: mensagemConviteEnviado(valores.email),
    valores: { nome: "", email: "", papel: "funcionario" },
  }
}

export async function alterarPapel(id: string, papel: Papel): Promise<ResultadoAcao> {
  await exigirAdministrador()

  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("usuarios").update({ papel }).eq("id", id)
  if (error) return { erro: mensagemDoBanco(error) }

  revalidatePath("/usuarios")
  return { erro: "" }
}

export async function alterarSituacao(id: string, ativo: boolean): Promise<ResultadoAcao> {
  await exigirAdministrador()

  // Primeiro o banco, que aplica a regra do último administrador; só depois o bloqueio do login.
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("usuarios").update({ ativo }).eq("id", id)
  if (error) return { erro: mensagemDoBanco(error) }

  const { error: erroLogin } = await criarClienteAdmin().auth.admin.updateUserById(id, {
    ban_duration: ativo ? "none" : "876000h",
  })
  if (erroLogin) return { erro: MENSAGENS.acaoFalhou }

  revalidatePath("/usuarios")
  return { erro: "" }
}
