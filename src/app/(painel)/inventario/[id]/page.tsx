import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { unidadesDeDigitacao } from "@/lib/estoque/quantidade"
import { formatarDia } from "@/lib/formatacao"
import { ROTULO_SITUACAO_INVENTARIO, TOM_SITUACAO_INVENTARIO } from "@/lib/inventario/rotulos"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { Contagem } from "./contagem"

// Depende da sessão (cookies) e da URL: o servidor espera antes de mostrar a página.
export const instant = false

type LoteParaContar = { lote_id: string; codigo: string; validade: string | null; contado: number | null }

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? ""
}

export default async function PaginaDoInventario({ params, searchParams }: PageProps<"/inventario/[id]">) {
  await exigirUsuario()
  const inventarioId = Number((await params).id)
  const busca = primeiro((await searchParams).q)
  if (!Number.isSafeInteger(inventarioId)) notFound()

  const supabase = await criarClienteServidor()
  const [inventarioR, resumoR] = await Promise.all([
    supabase.from("inventarios").select("id, descricao, situacao").eq("id", inventarioId).maybeSingle(),
    supabase.rpc("resumo_inventario", { p_inventario: inventarioId }).single(),
  ])
  if (inventarioR.error || !inventarioR.data) notFound()
  const inventario = inventarioR.data
  const emContagem = inventario.situacao === "aberto"

  const itensR = emContagem
    ? await supabase.rpc("itens_para_contar", { p_inventario: inventarioId, p_busca: busca })
    : null
  if (itensR?.error) throw itensR.error
  const itens = itensR?.data ?? []
  const formasR = itens.length
    ? await supabase
        .from("formas_venda")
        .select("id, variacao_id, nome, fator, peso_variavel, ativa")
        .in(
          "variacao_id",
          itens.map((item) => item.variacao_id),
        )
    : null
  const formasDa = (variacaoId: string) => (formasR?.data ?? []).filter((forma) => forma.variacao_id === variacaoId)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">
            Inventário nº {inventario.id}: {inventario.descricao}
          </h1>
          <Selo tom={TOM_SITUACAO_INVENTARIO[inventario.situacao]}>{ROTULO_SITUACAO_INVENTARIO[inventario.situacao]}</Selo>
        </div>
        <p className="text-sm text-muted-foreground">{resumoR.data?.itens_contados ?? 0} item(ns) contado(s)</p>
      </header>

      {emContagem ? (
        <>
          {/* Formulário GET: a busca fica na URL. */}
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-60 flex-1 flex-col gap-2">
              <Label htmlFor="busca-inventario">Buscar</Label>
              <Input id="busca-inventario" name="q" defaultValue={busca} placeholder="Nome, código interno ou de barras" />
            </div>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>

          {itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">{MENSAGENS.buscaInventarioVazia}</p>
          ) : (
            itens.map((item) => {
              const nome = `${item.produto} – ${item.variacao}`
              const unidades = unidadesDeDigitacao(item.tipo_venda, formasDa(item.variacao_id))
              const lotes = item.lotes as LoteParaContar[]
              return (
                <section key={item.variacao_id} aria-label={nome} className="vidro flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
                  <h2 className="text-lg font-semibold">
                    {nome} <span className="font-mono text-sm text-muted-foreground">{item.codigo_interno}</span>
                  </h2>
                  {lotes.map((lote) => (
                    <Contagem
                      key={lote.lote_id}
                      inventarioId={inventarioId}
                      variacaoId={item.variacao_id}
                      loteId={lote.lote_id}
                      titulo={
                        item.controla_validade
                          ? `Lote ${lote.codigo}, vence em ${lote.validade ? formatarDia(lote.validade) : "—"}`
                          : `Contagem de ${nome}`
                      }
                      unidades={unidades}
                      tipoVenda={item.tipo_venda}
                      contado={lote.contado}
                    />
                  ))}
                  {item.controla_validade ? (
                    <Contagem
                      inventarioId={inventarioId}
                      variacaoId={item.variacao_id}
                      loteId={null}
                      titulo="Lote que não está na lista"
                      unidades={unidades}
                      tipoVenda={item.tipo_venda}
                      contado={null}
                      loteNovo
                    />
                  ) : null}
                </section>
              )
            })
          )}
        </>
      ) : null}

      <nav className="flex flex-wrap gap-2">
        <Link href="/inventario" className="link-pilula">
          Voltar para os inventários
        </Link>
      </nav>
    </div>
  )
}
