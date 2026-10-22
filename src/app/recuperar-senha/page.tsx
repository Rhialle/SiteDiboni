import { TelaDeAcesso } from "@/components/tela-de-acesso"

import { FormularioRecuperacao } from "./formulario-recuperacao"

export default function PaginaRecuperarSenha() {
  return (
    <TelaDeAcesso
      titulo="Esqueci minha senha"
      descricao="Informe seu e-mail e enviaremos um link para criar uma nova senha."
    >
      <FormularioRecuperacao />
    </TelaDeAcesso>
  )
}
