"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import type { Database } from "@/lib/supabase/tipos"

type Escopo = Database["public"]["Enums"]["escopo_inventario"]

// Devolve o que foi digitado quando há erro (o React limpa o formulário depois da ação).
export type EstadoAbertura = { erro: string; valores: Record<string, string> | null }

const ESCOPOS: Escopo[] = ["loja", "categorias", "variacoes"]

export async function abrirInventario(_estado: EstadoAbertura, formData: FormData): Promise<EstadoAbertura> {
  await exigirAdministrador()
  const descricao = String(formData.get("descricao") ?? "").trim()
  const escopo = String(formData.get("escopo") ?? "loja") as Escopo
  const textoCodigos = String(formData.get("codigos") ?? "")
  const categorias = formData.getAll("categorias").map(String)
  const valores = { descricao, escopo, codigos: textoCodigos, categorias: categorias.join(",") }
  if (!ESCOPOS.includes(escopo)) return { erro: MENSAGENS.acaoFalhou, valores }

  // Um código por linha (vírgula e ponto e vírgula também separam).
  const codigos = textoCodigos
    .split(/[\n,;]/)
    .map((codigo) => codigo.trim())
    .filter(Boolean)
  const supabase = await criarClienteServidor()
  const { data: id, error } = await supabase.rpc("abrir_inventario", {
    p_descricao: descricao,
    p_escopo: escopo,
    p_categorias: escopo === "categorias" ? categorias : [],
    p_codigos: escopo === "variacoes" ? codigos : [],
  })
  if (error) return { erro: mensagemDoErroDoBanco(error), valores }

  revalidatePath("/inventario")
  redirect(`/inventario/${id}`)
}
