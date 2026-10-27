import Link from "next/link"

import { exigirUsuario } from "@/lib/auth/sessao"
import { avisosDoInicio, MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Depende da sessão (cookies) ou da URL: o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaInicio() {
  const usuario = await exigirUsuario()
  const supabase = await criarClienteServidor()
  // As contagens seguem quem está vendo: a funcionária conta só as solicitações dela e não vê a conferência.
  const { data: contagens, error } = await supabase.rpc("avisos_inicio").single()
  if (error) throw error
  const avisos = avisosDoInicio(contagens)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Início</h1>
        <p className="text-muted-foreground">Olá, {usuario.nome}</p>
      </div>
      <section aria-labelledby="avisos" className="flex flex-col gap-2">
        <h2 id="avisos" className="text-lg font-semibold">
          Avisos
        </h2>
        {avisos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{MENSAGENS.nenhumAviso}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {avisos.map((aviso) => (
              <li key={aviso.texto} className="rounded-lg border px-3 py-2">
                {aviso.link ? (
                  <Link href={aviso.link} className="hover:underline">
                    {aviso.texto}
                  </Link>
                ) : (
                  aviso.texto
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
