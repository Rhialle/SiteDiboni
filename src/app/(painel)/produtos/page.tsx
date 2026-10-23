import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { exigirUsuario } from "@/lib/auth/sessao"
import { caminhosDasCategorias, montarArvore } from "@/lib/catalogo/arvore"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { FiltrosProdutos, type Filtros } from "./filtros-produtos"
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
  const filtros: Filtros = {
    q: primeiro(parametros.q),
    categoria: primeiro(parametros.categoria),
    situacao: primeiro(parametros.situacao),
    tipo: primeiro(parametros.tipo),
    validade: primeiro(parametros.validade),
    material: primeiro(parametros.material),
  }
  const pagina = Math.max(1, Number(primeiro(parametros.pagina)) || 1)

  const supabase = await criarClienteServidor()
  const [busca, categoriasR, materiaisR] = await Promise.all([
    supabase.rpc("buscar_produtos", {
      p_termo: filtros.q || undefined,
      p_categoria: filtros.categoria || undefined,
      p_situacao: filtros.situacao || undefined,
      p_tipo_venda: filtros.tipo === "unidade" || filtros.tipo === "peso" ? filtros.tipo : undefined,
      p_controla_validade: filtros.validade === "sim" ? true : filtros.validade === "nao" ? false : undefined,
      p_etiqueta: filtros.material || undefined,
      p_limite: POR_PAGINA,
      p_deslocamento: (pagina - 1) * POR_PAGINA,
    }),
    supabase.from("categorias").select("id, nome, categoria_pai_id, ordem"),
    supabase.from("etiquetas").select("id, nome").order("nome"),
  ])
  for (const r of [busca, categoriasR, materiaisR]) if (r.error) throw r.error

  const produtos = busca.data ?? []
  const categorias = caminhosDasCategorias(montarArvore(categoriasR.data ?? []))
  const total = produtos[0]?.total ?? 0
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const ativos = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor))
  const endereco = (n: number) => `/produtos?${new URLSearchParams({ ...ativos, pagina: String(n) })}`

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

      <FiltrosProdutos filtros={filtros} categorias={categorias} materiais={materiaisR.data ?? []} />
      <TabelaProdutos produtos={produtos} podeEditar={usuario.papel === "administrador"} categorias={categorias} />

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
