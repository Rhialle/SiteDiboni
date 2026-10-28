import Link from "next/link"
import { notFound } from "next/navigation"

import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarQuantidade, unidadesDeDigitacao } from "@/lib/estoque/quantidade"
import { diaEmSaoPaulo, formatarCusto, formatarDia } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { EntradaManual } from "./entrada-manual"
import { PerdaOuAjuste } from "./perda-ajuste"

// Depende da sessão (cookies) e da URL: o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaEstoqueDaVariacao({ params }: PageProps<"/estoque/[variacaoId]">) {
  const usuario = await exigirUsuario()
  const administrador = usuario.papel === "administrador"
  const { variacaoId } = await params

  const supabase = await criarClienteServidor()
  const [variacaoR, saldosR, formasR, custoR] = await Promise.all([
    supabase
      .from("variacoes")
      .select("id, nome, codigo_interno, estoque_minimo, produtos(id, nome, tipo_venda, controla_validade)")
      .eq("id", variacaoId)
      .maybeSingle(),
    supabase.from("saldos").select("quantidade, lotes(id, codigo, validade)").eq("variacao_id", variacaoId).gt("quantidade", 0),
    supabase.from("formas_venda").select("id, nome, fator, peso_variavel, ativa").eq("variacao_id", variacaoId),
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
  const unidades = unidadesDeDigitacao(tipo, formasR.data ?? [])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">{produto.nome}</h1>
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
          <div className="tabela-vidro overflow-x-auto">
            <table aria-label="Lotes" className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Lote</th>
                  <th className="px-4 py-3 font-medium">Validade</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => (
                  <tr key={lote.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{lote.codigo}</td>
                    <td className="px-4 py-3">
                      {lote.validade ? formatarDia(lote.validade) : "—"}
                      {vencido(lote.validade) ? (
                        <Selo tom="critico" className="ml-2">
                          Vencido
                        </Selo>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{formatarQuantidade(lote.quantidade, tipo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      <PerdaOuAjuste
        variacaoId={variacao.id}
        unidades={unidades}
        lotes={lotes.map((lote) => ({ id: lote.id, codigo: lote.codigo, vencido: vencido(lote.validade) }))}
        controlaValidade={produto.controla_validade}
        porPeso={tipo === "peso"}
      />

      {administrador ? (
        <EntradaManual variacaoId={variacao.id} unidades={unidades} controlaValidade={produto.controla_validade} />
      ) : null}

      <nav className="flex flex-wrap gap-2">
        <Link href={`/estoque/movimentacoes?variacao=${variacao.id}`} className="link-pilula">
          Ver extrato
        </Link>
        <Link href={`/produtos/${produto.id}`} className="link-pilula">
          Ficha do produto
        </Link>
      </nav>
    </div>
  )
}
