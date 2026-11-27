import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { exigirUsuario } from "@/lib/auth/sessao"
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/balcao/rotulos"
import { formatarDataHora, formatarMoeda } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { ConferirCaixa } from "../formularios"
import { VendasDoCaixa } from "../vendas-do-caixa"

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaFechamento({ params }: PageProps<"/caixa/[id]">) {
  return (
    <Suspense fallback={<MolduraDeFicha tabela={4} />}>
      <Fechamento params={params} />
    </Suspense>
  )
}

async function Fechamento({ params }: Pick<PageProps<"/caixa/[id]">, "params">) {
  const caixaId = Number((await params).id)
  if (!Number.isSafeInteger(caixaId)) notFound()

  const supabase = await criarClienteServidor()
  const [usuario, resumoR, fechadosR, vendasR] = await Promise.all([
    exigirUsuario(),
    supabase.rpc("resumo_fechamento", { p_caixa: caixaId }),
    supabase.rpc("caixas_fechados"),
    supabase.from("vendas").select("id, numero, vendida_em, total_centavos, devolvido_centavos, situacao, cancelada_em").eq("caixa_id", caixaId).order("numero", { ascending: false }),
  ])
  // Caixa que não existe, ainda aberto ou que a pessoa não pode ver.
  if (resumoR.error) notFound()
  const caixa = (fechadosR.data ?? []).find((c) => c.id === caixaId)
  if (!caixa) notFound()
  const linhas = resumoR.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Fechamento do caixa</h1>
        <p className="text-sm text-muted-foreground">
          Aberto em {formatarDataHora(caixa.aberto_em)} · fechado em {formatarDataHora(caixa.fechado_em)}
          {caixa.fechado_por ? ` por ${caixa.fechado_por}` : ""}
        </p>
      </header>

      <div className="tabela-vidro overflow-x-auto">
        <table aria-label="Fechamento" className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Forma</th>
              <th className="px-4 py-3 font-medium">Esperado</th>
              <th className="px-4 py-3 font-medium">Contado</th>
              <th className="px-4 py-3 font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.forma} className="border-t">
                <td className="px-4 py-3 font-medium">{ROTULO_FORMA_PAGAMENTO[l.forma]}</td>
                <td className="px-4 py-3 tabular-nums">{formatarMoeda(l.esperado_centavos)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {l.informado_centavos === null ? "não informado" : formatarMoeda(l.informado_centavos)}
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">
                  {l.diferenca_centavos === null ? "—" : formatarMoeda(l.diferenca_centavos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="vendas-do-caixa" className="flex flex-col gap-3">
        <h2 id="vendas-do-caixa" className="text-xl font-semibold">
          Vendas
        </h2>
        <VendasDoCaixa vendas={vendasR.data ?? []} fechadoEm={caixa.fechado_em} />
      </section>

      {usuario.papel === "administrador" && caixa.com_diferenca && !caixa.conferido ? (
        <ConferirCaixa caixaId={caixaId} />
      ) : null}
      {caixa.conferido ? <p className="text-sm text-muted-foreground">Conferido pelo administrador.</p> : null}

      <Link href="/caixa" className="link-pilula self-start">
        Voltar para o caixa
      </Link>
    </div>
  )
}
