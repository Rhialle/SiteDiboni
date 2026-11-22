import Link from "next/link"
import { Suspense } from "react"

import { MolduraDeLista } from "@/components/painel/moldura"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/balcao/rotulos"
import { diaEmSaoPaulo, formatarDataHora, formatarMoeda } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

const DIA = /^\d{4}-\d{2}-\d{2}$/

function diaSeguinte(dia: string): string {
  const data = new Date(`${dia}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + 1)
  return data.toISOString().slice(0, 10)
}

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaVendas({ searchParams }: PageProps<"/vendas">) {
  return (
    <Suspense fallback={<MolduraDeLista colunas={5} />}>
      <Vendas searchParams={searchParams} />
    </Suspense>
  )
}

async function Vendas({ searchParams }: Pick<PageProps<"/vendas">, "searchParams">) {
  const pedido = (await searchParams).dia
  const dia = typeof pedido === "string" && DIA.test(pedido) ? pedido : diaEmSaoPaulo()

  const supabase = await criarClienteServidor()
  // Dia de São Paulo (sem horário de verão: -03:00).
  const [usuario, vendasR] = await Promise.all([
    exigirUsuario(),
    supabase
      .from("vendas")
      .select("id, numero, vendida_em, total_centavos, situacao, venda_pagamentos(forma)")
      .gte("vendida_em", `${dia}T00:00:00-03:00`)
      .lt("vendida_em", `${diaSeguinte(dia)}T00:00:00-03:00`)
      .order("numero", { ascending: false })
      .limit(300),
  ])
  if (vendasR.error) throw vendasR.error
  const vendas = vendasR.data ?? []
  const totalDoDia = vendas.filter((v) => v.situacao === "concluida").reduce((s, v) => s + v.total_centavos, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold sm:text-4xl">Vendas</h1>
          <p className="text-sm text-muted-foreground">
            {vendas.length} venda(s) · {formatarMoeda(totalDoDia)} sem as canceladas
          </p>
        </div>
        {usuario.papel === "administrador" ? (
          <Link href="/vendas/sem-saldo" className="link-pilula">
            Vendas sem saldo
          </Link>
        ) : null}
      </div>

      <form method="get" action="/vendas" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dia-vendas">Dia</Label>
          <Input id="dia-vendas" name="dia" type="date" defaultValue={dia} className="w-44" />
        </div>
        <Button type="submit" variant="outline">
          Ver
        </Button>
      </form>

      {vendas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma venda neste dia.</p>
      ) : (
        <div className="tabela-vidro overflow-x-auto">
          <table aria-label="Vendas" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nº</th>
                <th className="px-4 py-3 font-medium">Hora</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/vendas/${v.numero}`} className="font-medium hover:underline">
                      {v.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatarDataHora(v.vendida_em)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatarMoeda(v.total_centavos)}</td>
                  <td className="px-4 py-3">
                    {[...new Set(v.venda_pagamentos.map((p) => ROTULO_FORMA_PAGAMENTO[p.forma]))].join(" + ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Selo tom={v.situacao === "cancelada" ? "neutro" : "ok"}>{v.situacao === "cancelada" ? "Cancelada" : "Concluída"}</Selo>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
