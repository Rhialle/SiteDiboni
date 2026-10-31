import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { sair } from "@/app/entrar/acoes"
import { FundoFesta } from "@/components/festa/fundo-festa"
import { MarcaDiBoni } from "@/components/marca/monograma"
import { AbasCelular } from "@/components/painel/abas-celular"
import { MenuLateral } from "@/components/painel/menu-lateral"
import type { ItemDoMenu } from "@/components/painel/navegacao"
import { entradaDeTesteLigada } from "@/lib/auth/entrada-de-teste"
import { exigirUsuario, type UsuarioSessao } from "@/lib/auth/sessao"

// Depende da sessão (cookies) ou da URL: o servidor espera antes de mostrar a página.
export const instant = false

const PAPEIS = { administrador: "Administrador", funcionario: "Funcionário" } as const

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  const usuario = await exigirUsuario()
  if (usuario.papel === "administrador" && usuario.nivel !== "aal2") redirect("/entrar/duas-etapas")

  const itens: ItemDoMenu[] = [
    { href: "/inicio", rotulo: "Início", icone: "inicio", grupo: "principal" },
    { href: "/produtos", rotulo: "Produtos", icone: "produtos", grupo: "principal" },
    { href: "/estoque", rotulo: "Estoque", icone: "estoque", grupo: "principal" },
    { href: "/alertas", rotulo: "Alertas", icone: "alertas", grupo: "principal" },
    { href: "/notas", rotulo: "Notas", icone: "notas", grupo: "principal" },
    { href: "/inventario", rotulo: "Inventário", icone: "inventario", grupo: "principal" },
    ...(usuario.papel === "administrador"
      ? ([
          { href: "/categorias", rotulo: "Categorias", icone: "categorias", grupo: "administracao" },
          { href: "/usuarios", rotulo: "Usuários", icone: "usuarios", grupo: "administracao" },
          { href: "/configuracoes", rotulo: "Configurações", icone: "configuracoes", grupo: "administracao" },
        ] satisfies ItemDoMenu[])
      : []),
  ]

  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col bg-[linear-gradient(160deg,#f3edfb_0%,#eaf1f9_55%,#fbeff7_100%)]">
      <FundoFesta cena="painel" className="fixed -z-10" />
      {entradaDeTesteLigada() ? (
        <p role="note" className="relative z-30 bg-[#ffe7a3]/95 px-4 py-1.5 text-center text-sm font-medium text-tinta">
          Modo de teste: a entrada sem senha está ligada. Não cadastre dados reais da loja.
        </p>
      ) : null}
      <div className="flex flex-1">
        <MenuLateral itens={itens} pessoa={<Pessoa usuario={usuario} claro />} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="vidro-uva sticky top-0 z-20 px-4 py-3 md:hidden">
            <Link href="/inicio" className="inline-flex rounded-full">
              <MarcaDiBoni claro compacta />
            </Link>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-32 md:px-10 md:pt-10 md:pb-12">{children}</main>
        </div>
      </div>
      <AbasCelular itens={itens} rodapeDoMais={<Pessoa usuario={usuario} />} />
    </div>
  )
}

// Quem está usando, com o botão de sair. Clara no menu violeta; escura no "Mais" do celular.
function Pessoa({ usuario, claro = false }: { usuario: UsuarioSessao; claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-1.5 text-sm">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe7a3,var(--sol)_60%,#e0a21c)] text-base font-bold text-tinta shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_4px_10px_-4px_rgb(0_0_0/0.4)]"
      >
        {usuario.nome.trim().charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className={`truncate font-medium ${claro ? "text-white" : "text-tinta"}`}>{usuario.nome}</p>
        <p className={`text-[0.8125rem] ${claro ? "text-white/70" : "text-tinta-suave"}`}>{PAPEIS[usuario.papel]}</p>
      </div>
      <form action={sair} className="ml-auto">
        <button
          type="submit"
          className={
            claro
              ? "h-8 rounded-full border border-white/30 bg-white/15 px-3.5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-white/25"
              : "h-10 rounded-full border border-tinta/15 bg-white/80 px-4 text-sm font-medium text-tinta transition-colors hover:bg-white"
          }
        >
          Sair
        </button>
      </form>
    </div>
  )
}
