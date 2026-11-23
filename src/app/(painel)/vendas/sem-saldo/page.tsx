import Link from "next/link"
import { Suspense } from "react"

import { MolduraDeLista } from "@/components/painel/moldura"
import { exigirAdministrador } from "@/lib/auth/sessao"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { formatarDataHora } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { ConferirSemSaldo } from "../botoes"

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaVendasSemSaldo() {
  return (
    <Suspense fallback={<MolduraDeLista colunas={5} />}>
      <VendasSemSaldo />
    </Suspense>
  )
}

async function VendasSemSaldo() {
  const supabase = await criarClienteServidor()
  const [, itensR] = await Promise.all([exigirAdministrador(), supabase.rpc("vendas_sem_saldo")])
  if (itensR.error) throw itensR.error
  const itens = itensR.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Vendas sem saldo</h1>
        <p className="text-sm text-muted-foreground">
          Produtos vendidos quando o sistema dizia que não havia estoque. Confira a prateleira e, se precisar, faça um
          ajuste ou um inventário; depois marque como conferido.
        </p>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma venda sem saldo para conferir.</p>
      ) : (
        <div className="tabela-vidro overflow-x-auto">
          <table aria-label="Vendas sem saldo" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Venda</th>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Faltava no sistema</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Conferir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.item_id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/vendas/${item.numero}`} className="font-medium hover:underline">
                      nº {item.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatarDataHora(item.vendida_em)}</td>
                  <td className="px-4 py-3">
                    {item.produto} – {item.variacao}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatarQuantidade(Number(item.quantidade_sem_saldo_base), item.tipo_venda)}</td>
                  <td className="px-4 py-3">
                    <ConferirSemSaldo itemId={item.item_id} />
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
