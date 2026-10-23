import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { sair } from "@/app/entrar/acoes"
import { exigirUsuario } from "@/lib/auth/sessao"

// Depende da sessão (cookies) ou da URL: o servidor espera antes de mostrar a página.
export const instant = false

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  const usuario = await exigirUsuario()
  if (usuario.papel === "administrador" && usuario.nivel !== "aal2") redirect("/entrar/duas-etapas")

  const links = [
    { href: "/inicio", rotulo: "Início" },
    ...(usuario.papel === "administrador"
      ? [
          { href: "/usuarios", rotulo: "Usuários" },
          { href: "/configuracoes", rotulo: "Configurações" },
        ]
      : []),
  ]

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-sm font-semibold tracking-wide uppercase">Di Boni</span>
          <nav className="flex flex-1 flex-wrap gap-4 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
                {link.rotulo}
              </Link>
            ))}
          </nav>
          <form action={sair}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
