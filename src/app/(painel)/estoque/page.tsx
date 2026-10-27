import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { formatarDia } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Depende da sessão (cookies) e da URL: o servidor espera antes de mostrar a página.
export const instant = false

const POR_PAGINA = 50

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? ""
}

export default async function PaginaEstoque({ searchParams }: PageProps<"/estoque">) {
  await exigirUsuario()
  const parametros = await searchParams
  const q = primeiro(parametros.q)
  const soComSaldo = primeiro(parametros.saldo) === "sim"
  const pagina = Math.max(1, Number(primeiro(parametros.pagina)) || 1)

  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc("buscar_estoque", {
    p_termo: q || undefined,
    p_so_com_saldo: soComSaldo,
    p_limite: POR_PAGINA,
    p_deslocamento: (pagina - 1) * POR_PAGINA,
  })
  if (error) throw error

  const linhas = data ?? []
  const total = linhas[0]?.total ?? 0
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const filtros = { ...(q ? { q } : {}), ...(soComSaldo ? { saldo: "sim" } : {}) }
  const endereco = (n: number) => `/estoque?${new URLSearchParams({ ...filtros, pagina: String(n) })}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Estoque</h1>
        <p className="text-sm text-muted-foreground">{total} variação(ões)</p>
      </div>

      {/* Formulário GET: a busca fica na URL. */}
      <form method="get" action="/estoque" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="busca-estoque">Buscar</Label>
          <Input id="busca-estoque" name="q" defaultValue={q} placeholder="Nome, código interno ou de barras" className="w-72" />
        </div>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input type="checkbox" name="saldo" value="sim" defaultChecked={soComSaldo} />
          Só com saldo
        </label>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma variação encontrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table aria-label="Estoque" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Variação</th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Saldo</th>
                <th className="px-3 py-2 font-medium">Disponível</th>
                <th className="px-3 py-2 font-medium">Próxima validade</th>
                <th className="px-3 py-2 font-medium">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.variacao_id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/estoque/${l.variacao_id}`} className="font-medium hover:underline">
                      {l.produto}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{l.variacao}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.codigo_interno}</td>
                  <td className="px-3 py-2">{formatarQuantidade(l.saldo_total, l.tipo_venda)}</td>
                  <td className="px-3 py-2">{formatarQuantidade(l.saldo_disponivel, l.tipo_venda)}</td>
                  <td className="px-3 py-2">{l.proxima_validade ? formatarDia(l.proxima_validade) : "—"}</td>
                  <td className="px-3 py-2">{formatarQuantidade(l.estoque_minimo, l.tipo_venda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
