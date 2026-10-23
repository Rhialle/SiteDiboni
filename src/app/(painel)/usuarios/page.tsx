import { exigirAdministrador } from "@/lib/auth/sessao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { FormularioConvite } from "./formulario-convite"
import { TabelaUsuarios } from "./tabela-usuarios"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaUsuarios() {
  await exigirAdministrador()

  const supabase = await criarClienteServidor()
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, papel, ativo, criado_em")
    .order("nome")
  if (error) throw error

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Convide quem trabalha na loja. A pessoa recebe um e-mail para criar a própria senha.
        </p>
      </div>
      <FormularioConvite />
      <TabelaUsuarios usuarios={usuarios} />
    </div>
  )
}
