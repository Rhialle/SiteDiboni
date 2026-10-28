import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { ROTULO_TIPO_MOVIMENTACAO } from "@/lib/estoque/rotulos"
import { formatarDataHora, formatarDia } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import type { Database } from "@/lib/supabase/tipos"

import { BotaoEstornar } from "./botao-estornar"

// Depende da sessão (cookies) e da URL: o servidor espera antes de mostrar a página.
export const instant = false

const POR_PAGINA = 50
const SELECT = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
const DIA = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TipoMovimentacao = Database["public"]["Enums"]["tipo_movimentacao"]

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? ""
}

function diaSeguinte(dia: string): string {
  const momento = new Date(`${dia}T00:00:00Z`)
  momento.setUTCDate(momento.getUTCDate() + 1)
  return momento.toISOString().slice(0, 10)
}

export default async function PaginaMovimentacoes({ searchParams }: PageProps<"/estoque/movimentacoes">) {
  const usuario = await exigirUsuario()
  const administrador = usuario.papel === "administrador"
  const parametros = await searchParams
  const filtros = {
    tipo: primeiro(parametros.tipo) in ROTULO_TIPO_MOVIMENTACAO ? primeiro(parametros.tipo) : "",
    de: DIA.test(primeiro(parametros.de)) ? primeiro(parametros.de) : "",
    ate: DIA.test(primeiro(parametros.ate)) ? primeiro(parametros.ate) : "",
    variacao: UUID.test(primeiro(parametros.variacao)) ? primeiro(parametros.variacao) : "",
  }
  const pagina = Math.max(1, Number(primeiro(parametros.pagina)) || 1)

  const supabase = await criarClienteServidor()
  let consulta = supabase
    .from("extrato_movimentacoes")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
  if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo as TipoMovimentacao)
  // Datas de São Paulo (sem horário de verão: -03:00): "De" desde 00:00, "Até" até o fim do dia.
  if (filtros.de) consulta = consulta.gte("criado_em", `${filtros.de}T00:00:00-03:00`)
  if (filtros.ate) consulta = consulta.lt("criado_em", `${diaSeguinte(filtros.ate)}T00:00:00-03:00`)
  if (filtros.variacao) consulta = consulta.eq("variacao_id", filtros.variacao)
  const { data, count, error } = await consulta
  if (error) throw error

  const movimentacoes = data ?? []
  const paginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA))
  const ativos = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor))
  const endereco = (n: number) => `/estoque/movimentacoes?${new URLSearchParams({ ...ativos, pagina: String(n) })}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Movimentações</h1>
        {filtros.variacao && movimentacoes[0] ? (
          <p className="text-sm text-muted-foreground">
            Só de {movimentacoes[0].produto} — {movimentacoes[0].variacao}.{" "}
            <Link href="/estoque/movimentacoes" className="underline-offset-4 hover:underline">
              Ver todas
            </Link>
          </p>
        ) : null}
      </div>

      {/* Formulário GET: os filtros ficam na URL. */}
      <form method="get" action="/estoque/movimentacoes" className="flex flex-wrap items-end gap-3">
        {filtros.variacao ? <input type="hidden" name="variacao" value={filtros.variacao} /> : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="filtro-tipo-movimentacao">Tipo</Label>
          <select id="filtro-tipo-movimentacao" name="tipo" defaultValue={filtros.tipo} className={SELECT}>
            <option value="">Todos</option>
            {Object.entries(ROTULO_TIPO_MOVIMENTACAO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filtro-de">De</Label>
          <Input id="filtro-de" name="de" type="date" defaultValue={filtros.de} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filtro-ate">Até</Label>
          <Input id="filtro-ate" name="ate" type="date" defaultValue={filtros.ate} />
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {movimentacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma movimentação.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table aria-label="Movimentações" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data e hora</th>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Lote</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Quantidade</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
                <th className="px-3 py-2 font-medium">Feito por</th>
                {administrador ? <th className="px-3 py-2 font-medium"><span className="sr-only">Estorno</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m) => (
                <tr key={m.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{formatarDataHora(m.criado_em)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/estoque/${m.variacao_id}`} className="hover:underline">
                      {m.produto} — {m.variacao}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {m.lote ? `${m.lote}${m.validade ? ` (${formatarDia(m.validade)})` : ""}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {ROTULO_TIPO_MOVIMENTACAO[m.tipo] ?? m.tipo}
                    {m.estornada ? (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Estornada</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {m.quantidade > 0 ? "+" : ""}
                    {formatarQuantidade(m.quantidade, m.tipo_venda)}
                  </td>
                  <td className="px-3 py-2">{m.motivo}</td>
                  <td className="px-3 py-2">
                    {m.usuario ?? "—"}
                    {m.aprovado_por_nome ? ` (aprovado por ${m.aprovado_por_nome})` : ""}
                  </td>
                  {administrador ? (
                    <td className="px-3 py-2">
                      {m.tipo !== "estorno" ? <BotaoEstornar id={m.id} estornada={m.estornada ?? false} /> : null}
                    </td>
                  ) : null}
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
