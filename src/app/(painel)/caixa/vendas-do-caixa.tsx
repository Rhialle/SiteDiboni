import Link from "next/link"

import { Selo } from "@/components/ui/selo"
import { formatarDataHora, formatarMoeda } from "@/lib/formatacao"

export type VendaDoCaixa = {
  id: number
  numero: number
  vendida_em: string
  total_centavos: number
  situacao: "concluida" | "cancelada"
  cancelada_em: string | null
}

// As vendas de um caixa. A cancelada depois do fechamento fica marcada: o fechamento guardado a
// contou, e ela deixou de valer.
export function VendasDoCaixa({ vendas, fechadoEm }: { vendas: VendaDoCaixa[]; fechadoEm: string | null }) {
  if (vendas.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma venda neste caixa.</p>
  return (
    <div className="tabela-vidro overflow-x-auto">
      <table aria-label="Vendas do caixa" className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Nº</th>
            <th className="px-4 py-3 font-medium">Hora</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody>
          {vendas.map((v) => {
            const depois = v.situacao === "cancelada" && fechadoEm !== null && v.cancelada_em !== null && v.cancelada_em > fechadoEm
            return (
              <tr key={v.id} className="border-t">
                <td className="px-4 py-3">
                  <Link href={`/vendas/${v.numero}`} className="font-medium hover:underline">
                    {v.numero}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatarDataHora(v.vendida_em)}</td>
                <td className="px-4 py-3 tabular-nums">{formatarMoeda(v.total_centavos)}</td>
                <td className="px-4 py-3">
                  {v.situacao === "concluida" ? (
                    <Selo tom="ok">Concluída</Selo>
                  ) : (
                    <Selo tom={depois ? "atencao" : "neutro"}>{depois ? "Cancelada depois do fechamento" : "Cancelada"}</Selo>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
