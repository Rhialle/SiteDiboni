import Link from "next/link"
import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { ROTULO_MOVIMENTO_CAIXA } from "@/lib/balcao/rotulos"
import { formatarDataHora, formatarMoeda } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { AbrirCaixa, FecharCaixa, MovimentoCaixa } from "./formularios"
import { VendasDoCaixa } from "./vendas-do-caixa"

type Movimento = { tipo: keyof typeof ROTULO_MOVIMENTO_CAIXA; valor_centavos: number; motivo: string; em: string }

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaCaixa() {
  return (
    <Suspense fallback={<MolduraDeFicha paineis={2} />}>
      <Caixa />
    </Suspense>
  )
}

async function Caixa() {
  const supabase = await criarClienteServidor()
  const [, abertoR, fechadosR] = await Promise.all([
    exigirUsuario(),
    supabase.rpc("caixa_aberto"),
    supabase.rpc("caixas_fechados"),
  ])
  if (abertoR.error) throw abertoR.error
  if (fechadosR.error) throw fechadosR.error
  const aberto = abertoR.data?.[0]
  const fechados = fechadosR.data ?? []
  const vendasR = aberto
    ? await supabase.from("vendas").select("id, numero, vendida_em, total_centavos, situacao, cancelada_em").eq("caixa_id", aberto.id).order("numero", { ascending: false })
    : null
  if (vendasR?.error) throw vendasR.error
  const movimentos = (aberto?.movimentos ?? []) as Movimento[]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold sm:text-4xl">Caixa</h1>

      {aberto ? (
        <>
          <section aria-label="Caixa aberto" className="vidro flex flex-col gap-4 rounded-3xl p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">Caixa aberto</h2>
              <Selo tom="ok">Aberto</Selo>
            </div>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Aberto em</dt>
              <dd>{formatarDataHora(aberto.aberto_em)}</dd>
              <dt className="text-muted-foreground">Troco inicial</dt>
              <dd>{formatarMoeda(aberto.troco_inicial_centavos)}</dd>
              <dt className="text-muted-foreground">Vendas</dt>
              <dd>{aberto.vendas}</dd>
            </dl>
            {movimentos.length > 0 ? (
              <ul aria-label="Retiradas e reforços" className="flex flex-col gap-1 text-sm">
                {movimentos.map((m, i) => (
                  <li key={i}>
                    {ROTULO_MOVIMENTO_CAIXA[m.tipo]} de {formatarMoeda(m.valor_centavos)} — {m.motivo} ({formatarDataHora(m.em)})
                  </li>
                ))}
              </ul>
            ) : null}
            <h3 className="font-semibold">Vendas do dia</h3>
            <VendasDoCaixa vendas={vendasR?.data ?? []} fechadoEm={null} />
            <MovimentoCaixa />
            <Link href="/balcao" className="link-pilula self-start">
              Ir para o balcão
            </Link>
          </section>
          <FecharCaixa />
        </>
      ) : (
        <AbrirCaixa />
      )}

      <section aria-labelledby="caixas-fechados" className="flex flex-col gap-3">
        <h2 id="caixas-fechados" className="text-xl font-semibold">
          Caixas fechados
        </h2>
        {fechados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum caixa fechado.</p>
        ) : (
          <div className="tabela-vidro overflow-x-auto">
            <table aria-label="Caixas fechados" className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Aberto em</th>
                  <th className="px-4 py-3 font-medium">Fechado em</th>
                  <th className="px-4 py-3 font-medium">Diferença no dinheiro</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {fechados.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link href={`/caixa/${c.id}`} className="font-medium hover:underline">
                        {formatarDataHora(c.aberto_em)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatarDataHora(c.fechado_em)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatarMoeda(c.diferenca_dinheiro_centavos)}</td>
                    <td className="px-4 py-3">
                      {c.com_diferenca ? (
                        <Selo tom={c.conferido ? "neutro" : "atencao"}>{c.conferido ? "Conferido" : "Com diferença"}</Selo>
                      ) : (
                        <Selo tom="ok">Sem diferença</Selo>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
