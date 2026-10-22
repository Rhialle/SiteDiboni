import { TelaDeAcesso } from "@/components/tela-de-acesso"
import { MENSAGENS } from "@/lib/auth/mensagens"

import { FormularioEntrar } from "./formulario-entrar"

const AVISOS: Record<string, string> = {
  desativado: MENSAGENS.desativado,
  "link-invalido": MENSAGENS.linkInvalido,
}

// Depende da sessão (cookies) ou da URL: o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const { motivo } = await searchParams
  const aviso = typeof motivo === "string" ? AVISOS[motivo] : undefined

  return (
    <TelaDeAcesso titulo="Entrar" descricao="Use o e-mail e a senha do seu acesso à loja.">
      <FormularioEntrar aviso={aviso} />
    </TelaDeAcesso>
  )
}
