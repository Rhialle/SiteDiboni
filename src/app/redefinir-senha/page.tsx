import { redirect } from "next/navigation"

import { TelaDeAcesso } from "@/components/tela-de-acesso"
import { exigirUsuario } from "@/lib/auth/sessao"

import { FormularioRedefinicao } from "./formulario-redefinicao"

// Chega aqui pelo link do e-mail (convite ou recuperação), que já abriu a sessão.
// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaRedefinirSenha() {
  const usuario = await exigirUsuario()
  // Administrador só troca a senha depois do código do celular (o Supabase pode exigir isso).
  if (usuario.papel === "administrador" && usuario.nivel !== "aal2") {
    redirect("/entrar/duas-etapas?next=/redefinir-senha")
  }

  return (
    <TelaDeAcesso titulo="Criar nova senha" descricao="Escolha a senha que você vai usar para entrar.">
      <FormularioRedefinicao />
    </TelaDeAcesso>
  )
}
