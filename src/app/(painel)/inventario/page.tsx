import Link from "next/link"

import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { caminhosDasCategorias, montarArvore } from "@/lib/catalogo/arvore"
import { formatarDataHora } from "@/lib/formatacao"
import { ROTULO_ESCOPO_INVENTARIO, ROTULO_SITUACAO_INVENTARIO, TOM_SITUACAO_INVENTARIO } from "@/lib/inventario/rotulos"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { AbrirInventario } from "./abrir-inventario"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaInventario() {
  const usuario = await exigirUsuario()
  const administrador = usuario.papel === "administrador"
  const supabase = await criarClienteServidor()
  const [inventariosR, usuariosR, categoriasR] = await Promise.all([
    supabase
      .from("inventarios")
      .select("id, descricao, escopo, situacao, aberto_por, aberto_em")
      .order("aberto_em", { ascending: false })
      .limit(100),
    supabase.from("usuarios").select("id, nome"),
    administrador ? supabase.from("categorias").select("id, nome, categoria_pai_id, ordem") : null,
  ])
  if (inventariosR.error) throw inventariosR.error
  const nomes = new Map((usuariosR.data ?? []).map((u) => [u.id, u.nome]))
  const inventarios = inventariosR.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Inventário</h1>
        <p className="text-sm text-muted-foreground">
          Conte o estoque e acerte o saldo pelo que foi contado. Só um inventário fica em andamento por vez.
        </p>
      </div>

      {administrador ? <AbrirInventario categorias={caminhosDasCategorias(montarArvore(categoriasR?.data ?? []))} /> : null}

      {inventarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">{MENSAGENS.nenhumInventario}</p>
      ) : (
        <div className="tabela-vidro overflow-x-auto">
          <table aria-label="Inventários" className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nº</th>
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium">Escopo</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2 font-medium">Aberto em</th>
                <th className="px-3 py-2 font-medium">Aberto por</th>
              </tr>
            </thead>
            <tbody>
              {inventarios.map((inventario) => (
                <tr key={inventario.id} className="border-t">
                  <td className="px-3 py-2 tabular-nums">
                    <Link href={`/inventario/${inventario.id}`} className="font-medium hover:underline">
                      {inventario.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/inventario/${inventario.id}`} className="hover:underline">
                      {inventario.descricao}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{ROTULO_ESCOPO_INVENTARIO[inventario.escopo]}</td>
                  <td className="px-3 py-2">
                    <Selo tom={TOM_SITUACAO_INVENTARIO[inventario.situacao]}>
                      {ROTULO_SITUACAO_INVENTARIO[inventario.situacao]}
                    </Selo>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatarDataHora(inventario.aberto_em)}</td>
                  <td className="px-3 py-2">{nomes.get(inventario.aberto_por) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
