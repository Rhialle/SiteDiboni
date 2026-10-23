import Link from "next/link"

import { formatarMoeda } from "@/lib/formatacao"
import { ROTULO_SITUACAO, ROTULO_TIPO_VENDA } from "@/lib/catalogo/rotulos"

export type LinhaProduto = {
  id: string
  nome: string
  situacao: string
  tipo_venda: "unidade" | "peso"
  variacoes: number
  menor_preco_centavos: number | null
}

export function TabelaProdutos({ produtos }: { produtos: LinhaProduto[] }) {
  if (produtos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Produto</th>
            <th className="px-3 py-2 font-medium">Situação</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Variações</th>
            <th className="px-3 py-2 font-medium">Preço</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto) => (
            <tr key={produto.id} className="border-t">
              <td className="px-3 py-2">
                <Link href={`/produtos/${produto.id}`} className="font-medium hover:underline">
                  {produto.nome}
                </Link>
              </td>
              <td className="px-3 py-2">{ROTULO_SITUACAO[produto.situacao] ?? produto.situacao}</td>
              <td className="px-3 py-2">{ROTULO_TIPO_VENDA[produto.tipo_venda]}</td>
              <td className="px-3 py-2">{produto.variacoes}</td>
              <td className="px-3 py-2">
                {produto.menor_preco_centavos === null
                  ? "—"
                  : `a partir de ${formatarMoeda(produto.menor_preco_centavos)}${produto.tipo_venda === "peso" ? "/kg" : ""}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
