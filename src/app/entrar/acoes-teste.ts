"use server"

import { redirect } from "next/navigation"
import { Secret, TOTP } from "otpauth"

import { CONTAS_DE_TESTE, entradaDeTesteLigada, type PapelDeTeste } from "@/lib/auth/entrada-de-teste"
import { criarClienteAdmin } from "@/lib/supabase/admin"
import { criarClienteServidor } from "@/lib/supabase/servidor"

type Admin = ReturnType<typeof criarClienteAdmin>
type Sessao = Awaited<ReturnType<typeof criarClienteServidor>>

const SEGREDO = "segredo_entrada_de_teste"

// A conta de teste existe, está ativa e tem o papel certo (alguém pode tê-la desativado na tela de usuários).
async function garantirConta(admin: Admin, papel: PapelDeTeste): Promise<string> {
  const conta = CONTAS_DE_TESTE[papel]
  const { data: existente, error: erroBusca } = await admin.from("usuarios").select("id").eq("email", conta.email).maybeSingle()
  if (erroBusca) throw erroBusca

  let id = existente?.id
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: conta.email,
      email_confirm: true,
      user_metadata: { nome: conta.nome },
    })
    if (error) throw error
    id = data.user.id
  }
  const { error: erroBloqueio } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" })
  if (erroBloqueio) throw erroBloqueio
  const { error: erroPapel } = await admin.from("usuarios").update({ papel, ativo: true }).eq("id", id)
  if (erroPapel) throw erroPapel
  return id
}

// O administrador precisa das duas etapas (o banco exige). A conta de teste guarda o segredo do
// aplicativo autenticador nos próprios dados e gera o código aqui mesmo.
async function completarDuasEtapas(admin: Admin, supabase: Sessao, id: string): Promise<void> {
  const { data: usuario, error: erroUsuario } = await admin.auth.admin.getUserById(id)
  if (erroUsuario) throw erroUsuario
  const segredo = usuario.user.app_metadata?.[SEGREDO] as string | undefined
  const codigo = (base32: string) => new TOTP({ secret: Secret.fromBase32(base32) }).generate()

  const { data: fatores, error: erroFatores } = await supabase.auth.mfa.listFactors()
  if (erroFatores) throw erroFatores
  const verificado = fatores.totp.find((fator) => fator.status === "verified")
  if (verificado && segredo) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: verificado.id, code: codigo(segredo) })
    if (error) throw error
    return
  }

  // Sem segredo conhecido: tira os fatores antigos e cadastra um novo.
  for (const fator of fatores.all) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ userId: id, id: fator.id })
    if (error) throw error
  }
  const { data: novo, error: erroCadastro } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Entrada de teste",
  })
  if (erroCadastro) throw erroCadastro
  const { error: erroCodigo } = await supabase.auth.mfa.challengeAndVerify({ factorId: novo.id, code: codigo(novo.totp.secret) })
  if (erroCodigo) throw erroCodigo
  const { error: erroGuardar } = await admin.auth.admin.updateUserById(id, { app_metadata: { [SEGREDO]: novo.totp.secret } })
  if (erroGuardar) throw erroGuardar
}

export async function entrarComoTeste(papel: PapelDeTeste): Promise<void> {
  // Com o modo desligado, o botão nem aparece; a conferência aqui vale para quem chamar a ação direto.
  if (!entradaDeTesteLigada()) redirect("/entrar")

  const admin = criarClienteAdmin()
  const id = await garantirConta(admin, papel)

  // Sessão sem senha: um link de acesso gerado e confirmado aqui mesmo, sem e-mail.
  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: CONTAS_DE_TESTE[papel].email,
  })
  if (erroLink) throw erroLink
  const supabase = await criarClienteServidor()
  const { error: erroSessao } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token })
  if (erroSessao) throw erroSessao

  if (papel === "administrador") await completarDuasEtapas(admin, supabase, id)
  redirect("/inicio")
}
