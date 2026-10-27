import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { ROTULO_SITUACAO_SOLICITACAO, ROTULO_TIPO_MOVIMENTACAO } from "@/lib/estoque/rotulos"
import { formatarData, formatarDia } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { BotoesDecisao } from "./botoes-decisao"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

// O administrador vê e decide todas; a funcionária vê as dela (a RLS do banco faz esse recorte).
export default async function PaginaSolicitacoes() {
  const usuario = await exigirUsuario()
  const administrador = usuario.papel === "administrador"

  const supabase = await criarClienteServidor()
  const [solicitacoesR, usuariosR] = await Promise.all([
    supabase
      .from("solicitacoes_ajuste")
      .select("id, tipo, quantidade, motivo, situacao, solicitado_em, solicitado_por, lotes(codigo, validade), variacoes(nome, produtos(nome, tipo_venda))")
      .order("solicitado_em", { ascending: false })
      .limit(200),
    supabase.from("usuarios").select("id, nome"),
  ])
  if (solicitacoesR.error) throw solicitacoesR.error

  const nomes = new Map((usuariosR.data ?? []).map((u) => [u.id, u.nome]))
  // Pendentes primeiro; dentro de cada grupo, as mais recentes antes.
  const solicitacoes = [...(solicitacoesR.data ?? [])].sort(
    (a, b) => Number(b.situacao === "pendente") - Number(a.situacao === "pendente"),
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Solicitações</h1>
      {solicitacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitação.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table aria-label="Solicitações" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Lote</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Quantidade</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
                <th className="px-3 py-2 font-medium">Pedido por</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                {administrador ? <th className="px-3 py-2 font-medium"><span className="sr-only">Decidir</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((s) => (
                <tr key={s.id} className="border-t align-top">
                  <td className="px-3 py-2">{formatarData(s.solicitado_em)}</td>
                  <td className="px-3 py-2">
                    {s.variacoes.produtos.nome} — {s.variacoes.nome}
                  </td>
                  <td className="px-3 py-2">
                    {s.lotes.validade ? `${s.lotes.codigo} (${formatarDia(s.lotes.validade)})` : "—"}
                  </td>
                  <td className="px-3 py-2">{ROTULO_TIPO_MOVIMENTACAO[s.tipo] ?? s.tipo}</td>
                  <td className="px-3 py-2">{formatarQuantidade(s.quantidade, s.variacoes.produtos.tipo_venda)}</td>
                  <td className="px-3 py-2">{s.motivo}</td>
                  <td className="px-3 py-2">{nomes.get(s.solicitado_por) ?? "—"}</td>
                  <td className="px-3 py-2">{ROTULO_SITUACAO_SOLICITACAO[s.situacao]}</td>
                  {administrador ? (
                    <td className="px-3 py-2">{s.situacao === "pendente" ? <BotoesDecisao id={s.id} /> : null}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
