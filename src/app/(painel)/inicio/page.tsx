import { exigirUsuario } from "@/lib/auth/sessao"

// Depende da sessão (cookies) ou da URL: o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaInicio() {
  const usuario = await exigirUsuario()

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Início</h1>
      <p className="text-muted-foreground">Olá, {usuario.nome}</p>
    </div>
  )
}
