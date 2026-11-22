import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { exigirAdministrador } from "@/lib/auth/sessao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { FormularioConvite } from "./formulario-convite"
import { TabelaUsuarios } from "./tabela-usuarios"

const DESCRICAO = "Convide quem trabalha na loja. A pessoa recebe um e-mail para criar a própria senha."

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaUsuarios() {
  return (
    <Suspense fallback={<MolduraDeFicha titulo="Usuários" descricao={DESCRICAO} tabela={4} />}>
      <Usuarios />
    </Suspense>
  )
}

async function Usuarios() {
  const supabase = await criarClienteServidor()
  const [, { data: usuarios, error }] = await Promise.all([
    exigirAdministrador(),
    supabase.from("usuarios").select("id, nome, email, papel, ativo, criado_em").order("nome"),
  ])
  if (error) throw error

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          {DESCRICAO}
        </p>
      </div>
      <FormularioConvite />
      <TabelaUsuarios usuarios={usuarios} />
    </div>
  )
}
