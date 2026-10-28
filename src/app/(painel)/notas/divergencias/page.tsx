import Link from "next/link"

import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { formatarData } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

// "+2 un" quando veio a mais, "-2 un" quando veio a menos.
function comSinal(diferenca: number, tipo: "unidade" | "peso"): string {
  return `${diferenca > 0 ? "+" : ""}${formatarQuantidade(diferenca, tipo)}`
}

export default async function PaginaDivergencias() {
  await exigirUsuario()
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from("divergencias_fornecedor")
    .select(
      "nota_id, fornecedor, numero, confirmada_em, numero_item, descricao, quantidade_base_nota, quantidade_base_recebida, diferenca, produto, variacao, tipo_venda",
    )
    .order("confirmada_em", { ascending: false })
    .order("numero_item")
    .limit(200)
  if (error) throw error
  const divergencias = data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Divergências</h1>
        <p className="text-sm text-muted-foreground">
          Itens de notas confirmadas em que o recebido foi diferente da nota, das mais recentes para as mais antigas.
        </p>
      </div>

      {divergencias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma divergência.</p>
      ) : (
        <div className="tabela-vidro overflow-x-auto">
          <table aria-label="Divergências" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Fornecedor</th>
                <th className="px-3 py-2 font-medium">Nota</th>
                <th className="px-3 py-2 font-medium">Confirmada em</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Na nota</th>
                <th className="px-3 py-2 font-medium">Recebido</th>
                <th className="px-3 py-2 font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {divergencias.map((d) => (
                <tr key={`${d.nota_id}-${d.numero_item}`} className="border-t align-top">
                  <td className="px-3 py-2">{d.fornecedor}</td>
                  <td className="px-3 py-2">
                    <Link href={`/notas/${d.nota_id}`} className="font-medium hover:underline">
                      {d.numero}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{d.confirmada_em ? formatarData(d.confirmada_em) : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {d.produto} – {d.variacao}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Item {d.numero_item}: {d.descricao}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {formatarQuantidade(d.quantidade_base_nota ?? 0, d.tipo_venda)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {formatarQuantidade(d.quantidade_base_recebida ?? 0, d.tipo_venda)}
                  </td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap tabular-nums">
                    {comSinal(d.diferenca ?? 0, d.tipo_venda)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className="flex flex-wrap gap-2">
        <Link href="/notas" className="link-pilula">
          Voltar para as notas
        </Link>
      </nav>
    </div>
  )
}
