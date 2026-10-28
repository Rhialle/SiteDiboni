import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarData } from "@/lib/formatacao"
import { ROTULO_SITUACAO_NOTA, TOM_SITUACAO_NOTA } from "@/lib/notas/rotulos"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import type { Database } from "@/lib/supabase/tipos"

import { ImportarNotas } from "./importar-notas"

// Depende da sessão (cookies) e da URL: o servidor espera antes de mostrar a página.
export const instant = false

type Situacao = Database["public"]["Enums"]["situacao_nota"]

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? ""
}

export default async function PaginaNotas({ searchParams }: PageProps<"/notas">) {
  await exigirUsuario()
  const escolhida = primeiro((await searchParams).situacao)
  const situacao = escolhida in ROTULO_SITUACAO_NOTA ? (escolhida as Situacao) : ""

  const supabase = await criarClienteServidor()
  let consulta = supabase
    .from("notas_entrada")
    .select("id, numero, serie, emitida_em, situacao, importada_por, fornecedores(nome), notas_entrada_itens(count)")
    .order("importada_em", { ascending: false })
    .limit(100)
  if (situacao) consulta = consulta.eq("situacao", situacao)
  const [notasR, usuariosR] = await Promise.all([consulta, supabase.from("usuarios").select("id, nome")])
  if (notasR.error) throw notasR.error

  const nomes = new Map((usuariosR.data ?? []).map((u) => [u.id, u.nome]))
  const notas = notasR.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold sm:text-4xl">Notas de entrada</h1>
          <p className="text-sm text-muted-foreground">Notas fiscais de compra: importe o XML, confira e dê entrada no estoque.</p>
        </div>
        <Link href="/notas/divergencias" className="link-pilula">
          Divergências
        </Link>
      </div>

      <ImportarNotas />

      {/* Formulário GET: o filtro fica na URL. */}
      <form method="get" action="/notas" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filtro-situacao-nota">Situação</Label>
          <select id="filtro-situacao-nota" name="situacao" defaultValue={situacao} className="campo-escolha">
            <option value="">Todas</option>
            {Object.entries(ROTULO_SITUACAO_NOTA).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {notas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma nota.</p>
      ) : (
        <div className="tabela-vidro overflow-x-auto">
          <table aria-label="Notas" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Número</th>
                <th className="px-3 py-2 font-medium">Fornecedor</th>
                <th className="px-3 py-2 font-medium">Emitida em</th>
                <th className="px-3 py-2 font-medium">Itens</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2 font-medium">Importada por</th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => (
                <tr key={n.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/notas/${n.id}`} className="font-medium hover:underline">
                      {n.numero}
                      {n.serie ? `/${n.serie}` : ""}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{n.fornecedores.nome}</td>
                  <td className="px-3 py-2">{formatarData(n.emitida_em)}</td>
                  <td className="px-3 py-2 tabular-nums">{n.notas_entrada_itens[0]?.count ?? 0}</td>
                  <td className="px-3 py-2">
                    <Selo tom={TOM_SITUACAO_NOTA[n.situacao]}>{ROTULO_SITUACAO_NOTA[n.situacao]}</Selo>
                  </td>
                  <td className="px-3 py-2">{nomes.get(n.importada_por) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
