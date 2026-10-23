import { notFound } from "next/navigation"

import { exigirUsuario } from "@/lib/auth/sessao"
import { ROTULO_SITUACAO, ROTULO_TIPO_VENDA } from "@/lib/catalogo/rotulos"
import { mensagemPendencias } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

const COR_SITUACAO: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  incompleto: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  inativo: "bg-muted text-muted-foreground",
}

export default async function PaginaProduto({ params }: PageProps<"/produtos/[id]">) {
  const { id } = await params
  await exigirUsuario()

  const supabase = await criarClienteServidor()
  const [{ data: produto }, { data: variacoes, error: erroVariacoes }] = await Promise.all([
    supabase.from("produtos_com_situacao").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("variacoes")
      .select("id, nome, codigo_interno, codigo_barras, ativa")
      .eq("produto_id", id)
      .order("criado_em"),
  ])
  if (!produto) notFound()
  if (erroVariacoes) throw erroVariacoes

  const pendencias = produto.pendencias ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{produto.nome}</h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COR_SITUACAO[produto.situacao ?? ""] ?? ""}`}
          >
            {ROTULO_SITUACAO[produto.situacao ?? ""] ?? produto.situacao}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {produto.tipo_venda ? ROTULO_TIPO_VENDA[produto.tipo_venda] : null}
        </p>
        {produto.situacao === "incompleto" && pendencias.length > 0 ? (
          <p className="text-sm text-amber-800 dark:text-amber-300">{mensagemPendencias(pendencias)}</p>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Variações</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {variacoes.map((variacao) => (
            <li key={variacao.id} className="flex flex-wrap gap-3 rounded-lg border px-3 py-2">
              <span className="font-medium">{variacao.nome}</span>
              <span className="font-mono text-muted-foreground">{variacao.codigo_interno}</span>
              {variacao.codigo_barras ? (
                <span className="font-mono text-muted-foreground">{variacao.codigo_barras}</span>
              ) : null}
              {variacao.ativa ? null : <span className="text-muted-foreground">(inativa)</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
