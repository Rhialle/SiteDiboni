import { redirect } from "next/navigation"

import { TelaDeAcesso } from "@/components/tela-de-acesso"
import { exigirUsuario } from "@/lib/auth/sessao"

import { VerificacaoDuasEtapas } from "./verificacao-duas-etapas"

// Depende da sessão (cookies) ou da URL: o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaDuasEtapas() {
  const usuario = await exigirUsuario()
  if (usuario.nivel === "aal2") redirect("/inicio")

  return (
    <TelaDeAcesso
      titulo="Verificação em duas etapas"
      descricao="Use um aplicativo autenticador no celular, como Google Authenticator ou Microsoft Authenticator."
    >
      <VerificacaoDuasEtapas />
    </TelaDeAcesso>
  )
}
