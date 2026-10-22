import { TelaDeAcesso } from "@/components/tela-de-acesso"
import { exigirUsuario } from "@/lib/auth/sessao"

import { FormularioRedefinicao } from "./formulario-redefinicao"

// Chega aqui pelo link do e-mail (convite ou recuperação), que já abriu a sessão.
// Depende da sessão (cookies) ou da URL: o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaRedefinirSenha() {
  await exigirUsuario()

  return (
    <TelaDeAcesso titulo="Criar nova senha" descricao="Escolha a senha que você vai usar para entrar.">
      <FormularioRedefinicao />
    </TelaDeAcesso>
  )
}
