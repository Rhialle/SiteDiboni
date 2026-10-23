import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { exigirUsuario } from "@/lib/auth/sessao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { FiltrosProdutos } from "./filtros-produtos"
import { TabelaProdutos } from "./tabela-produtos"

// Depende da sessão (cookies) e da URL: o servidor espera antes de mostrar a página.
export const instant = false

const POR_PAGINA = 50

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? ""
}

export default async function PaginaProdutos({ searchParams }: PageProps<"/produtos">) {
  const usuario = await exigirUsuario()
  const parametros = await searchParams
  const termo = primeiro(parametros.q)
  const pagina = Math.max(1, Number(primeiro(parametros.pagina)) || 1)

  const supabase = await criarClienteServidor()
  const { data: produtos, error } = await supabase.rpc("buscar_produtos", {
    p_termo: termo || undefined,
    p_limite: POR_PAGINA,
    p_deslocamento: (pagina - 1) * POR_PAGINA,
  })
  if (error) throw error

  const total = produtos[0]?.total ?? 0
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const endereco = (n: number) => `/produtos?${new URLSearchParams({ ...(termo ? { q: termo } : {}), pagina: String(n) })}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">{total} produto(s)</p>
        </div>
        {usuario.papel === "administrador" ? (
          <Link href="/produtos/novo" className={buttonVariants()}>
            Novo produto
          </Link>
        ) : null}
      </div>

      <FiltrosProdutos termo={termo} />
      <TabelaProdutos produtos={produtos} />

      {paginas > 1 ? (
        <nav aria-label="Páginas" className="flex items-center gap-3 text-sm">
          {pagina > 1 ? <Link href={endereco(pagina - 1)}>Anterior</Link> : null}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? <Link href={endereco(pagina + 1)}>Próxima</Link> : null}
        </nav>
      ) : null}
    </div>
  )
}
