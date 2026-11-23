import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/balcao/rotulos"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { ROTULO_TIPO_MOVIMENTACAO } from "@/lib/estoque/rotulos"
import { formatarCusto, formatarDataHora, formatarMoeda } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { CancelarVenda } from "../botoes"

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaVenda({ params }: PageProps<"/vendas/[numero]">) {
  return (
    <Suspense fallback={<MolduraDeFicha tabela={4} />}>
      <Venda params={params} />
    </Suspense>
  )
}

async function Venda({ params }: Pick<PageProps<"/vendas/[numero]">, "params">) {
  const numero = Number((await params).numero)
  if (!Number.isSafeInteger(numero)) notFound()

  const supabase = await criarClienteServidor()
  const [usuario, vendaR] = await Promise.all([
    exigirUsuario(),
    supabase
      .from("vendas")
      .select(
        "id, numero, vendida_em, subtotal_centavos, desconto_centavos, total_centavos, situacao, cancelada_em, motivo_cancelamento, venda_itens(id, quantidade, quantidade_base, quantidade_sem_saldo_base, preco_unitario_centavos, total_centavos, formas_venda(nome, peso_variavel), variacoes(nome, produtos(nome, tipo_venda))), venda_pagamentos(id, forma, valor_centavos, recebido_centavos, troco_centavos)",
      )
      .eq("numero", numero)
      .maybeSingle(),
  ])
  if (vendaR.error || !vendaR.data) notFound()
  const venda = vendaR.data
  const administrador = usuario.papel === "administrador"

  // Saídas e entradas por lote.
  const movimentosR = await supabase
    .from("extrato_movimentacoes")
    .select("id, tipo, quantidade, lote, produto, variacao, tipo_venda, estornada")
    .eq("origem", "venda")
    .eq("origem_id", String(venda.id))
    .order("id")
  if (movimentosR.error) throw movimentosR.error
  const movimentos = movimentosR.data ?? []
  // O custo só abre para o administrador (a tabela também), e só o destas movimentações: a tabela
  // inteira passaria do limite de 1.000 linhas por consulta.
  const custosR =
    administrador && movimentos.length > 0
      ? await supabase
          .from("movimentacoes_custos")
          .select("movimentacao_id, custo_unitario")
          .in(
            "movimentacao_id",
            movimentos.map((m) => m.id).filter((id): id is number => id !== null),
          )
      : null
  const custos = new Map((custosR?.data ?? []).map((c) => [c.movimentacao_id, c.custo_unitario]))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">Venda nº {venda.numero}</h1>
          <Selo tom={venda.situacao === "cancelada" ? "neutro" : "ok"}>{venda.situacao === "cancelada" ? "Cancelada" : "Concluída"}</Selo>
        </div>
        <p className="text-sm text-muted-foreground">{formatarDataHora(venda.vendida_em)}</p>
        {venda.situacao === "cancelada" && venda.cancelada_em ? (
          <p className="text-sm">
            Cancelada em {formatarDataHora(venda.cancelada_em)}: {venda.motivo_cancelamento}
          </p>
        ) : null}
      </header>

      <div className="tabela-vidro overflow-x-auto">
        <table aria-label="Itens" className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Quantidade</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {venda.venda_itens.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3">
                  {item.variacoes.produtos.nome} – {item.variacoes.nome}
                  {item.quantidade_sem_saldo_base > 0 ? (
                    <span className="ml-2 text-xs font-medium text-[#6e4d00]">venda sem saldo</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {item.formas_venda.peso_variavel ? `${item.quantidade} g` : `${item.quantidade} × ${item.formas_venda.nome}`}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatarMoeda(item.preco_unitario_centavos)}
                  {item.formas_venda.peso_variavel ? " o kg" : ""}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatarMoeda(item.total_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="grid max-w-md gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{formatarMoeda(venda.subtotal_centavos)}</dd>
        {venda.desconto_centavos > 0 ? (
          <>
            <dt className="text-muted-foreground">Desconto</dt>
            <dd>{formatarMoeda(venda.desconto_centavos)}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Total</dt>
        <dd className="font-semibold">{formatarMoeda(venda.total_centavos)}</dd>
        {venda.venda_pagamentos.map((p) => (
          <div key={p.id} className="contents">
            <dt className="text-muted-foreground">{ROTULO_FORMA_PAGAMENTO[p.forma]}</dt>
            <dd>
              {formatarMoeda(p.valor_centavos)}
              {p.troco_centavos > 0 ? ` (recebido ${formatarMoeda(p.recebido_centavos ?? 0)}, troco ${formatarMoeda(p.troco_centavos)})` : ""}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="saidas" className="flex flex-col gap-3">
        <h2 id="saidas" className="text-xl font-semibold">
          Estoque
        </h2>
        <div className="tabela-vidro overflow-x-auto">
          <table aria-label="Movimentações da venda" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Lote</th>
                <th className="px-4 py-3 font-medium">Quantidade</th>
                {administrador ? <th className="px-4 py-3 font-medium">Custo</th> : null}
              </tr>
            </thead>
            <tbody>
              {movimentos.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-3">
                    {m.produto} – {m.variacao}
                  </td>
                  <td className="px-4 py-3">
                    {ROTULO_TIPO_MOVIMENTACAO[m.tipo]}
                    {m.estornada ? " (estornada)" : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{m.lote ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatarQuantidade(m.quantidade, m.tipo_venda)}</td>
                  {administrador ? (
                    <td className="px-4 py-3 tabular-nums">{custos.has(m.id) ? formatarCusto(custos.get(m.id)!) : "sem custo"}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {administrador && venda.situacao === "concluida" ? <CancelarVenda vendaId={venda.id} numero={venda.numero} /> : null}

      <nav className="flex flex-wrap gap-2">
        <Link href={`/vendas/${venda.numero}/comprovante`} className="link-pilula">
          Comprovante
        </Link>
        <Link href="/vendas" className="link-pilula">
          Voltar para as vendas
        </Link>
      </nav>
    </div>
  )
}
