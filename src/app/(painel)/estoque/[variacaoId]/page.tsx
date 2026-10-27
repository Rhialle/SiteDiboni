import Link from "next/link"
import { notFound } from "next/navigation"

import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { diaEmSaoPaulo, formatarCusto, formatarDia } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Depende da sessão (cookies) e da URL: o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaEstoqueDaVariacao({ params }: PageProps<"/estoque/[variacaoId]">) {
  const usuario = await exigirUsuario()
  const administrador = usuario.papel === "administrador"
  const { variacaoId } = await params

  const supabase = await criarClienteServidor()
  const [variacaoR, saldosR, custoR] = await Promise.all([
    supabase
      .from("variacoes")
      .select("id, nome, codigo_interno, estoque_minimo, produtos(id, nome, tipo_venda, controla_validade)")
      .eq("id", variacaoId)
      .maybeSingle(),
    supabase.from("saldos").select("quantidade, lotes(id, codigo, validade)").eq("variacao_id", variacaoId).gt("quantidade", 0),
    // Custo só para o administrador (a tabela também só abre para ele).
    administrador
      ? supabase.from("custos_variacao").select("custo_medio").eq("variacao_id", variacaoId).maybeSingle()
      : null,
  ])
  // Endereço com id inválido ou de variação que não existe.
  if (variacaoR.error || !variacaoR.data) notFound()
  if (saldosR.error) throw saldosR.error

  const variacao = variacaoR.data
  const produto = variacao.produtos
  const tipo = produto.tipo_venda
  const hoje = diaEmSaoPaulo()
  const vencido = (validade: string | null) => validade !== null && validade < hoje

  const lotes = (saldosR.data ?? [])
    .map((s) => ({ ...s.lotes, quantidade: s.quantidade }))
    .sort((a, b) => (a.validade ?? "9999-12-31").localeCompare(b.validade ?? "9999-12-31"))
  const total = lotes.reduce((soma, l) => soma + l.quantidade, 0)
  const disponivel = lotes.filter((l) => !vencido(l.validade)).reduce((soma, l) => soma + l.quantidade, 0)
  const custo = custoR?.data?.custo_medio

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{produto.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {variacao.nome} · <span className="font-mono">{variacao.codigo_interno}</span>
        </p>
      </header>

      <section className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <p>Saldo: {formatarQuantidade(total, tipo)}</p>
        {produto.controla_validade ? <p>Disponível: {formatarQuantidade(disponivel, tipo)}</p> : null}
        <p>Estoque mínimo: {formatarQuantidade(variacao.estoque_minimo, tipo)}</p>
        {administrador ? (
          <p>Custo médio: {custo === undefined || custo === null ? "sem entrada com custo" : formatarCusto(custo)}</p>
        ) : null}
      </section>

      {produto.controla_validade ? (
        lotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lote com saldo.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table aria-label="Lotes" className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Lote</th>
                  <th className="px-3 py-2 font-medium">Validade</th>
                  <th className="px-3 py-2 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => (
                  <tr key={lote.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{lote.codigo}</td>
                    <td className="px-3 py-2">
                      {lote.validade ? formatarDia(lote.validade) : "—"}
                      {vencido(lote.validade) ? (
                        <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                          Vencido
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{formatarQuantidade(lote.quantidade, tipo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href={`/estoque/movimentacoes?variacao=${variacao.id}`} className="underline-offset-4 hover:underline">
          Ver extrato
        </Link>
        <Link href={`/produtos/${produto.id}`} className="underline-offset-4 hover:underline">
          Ficha do produto
        </Link>
      </nav>
    </div>
  )
}
