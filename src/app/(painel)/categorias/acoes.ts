"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type ResultadoCategoria = { erro: string }

const OK: ResultadoCategoria = { erro: "" }

async function concluir(erro: { code?: string; message: string } | null): Promise<ResultadoCategoria> {
  if (erro) return { erro: mensagemDoErroDoBanco(erro) }
  revalidatePath("/categorias")
  return OK
}

export async function criarCategoria(
  _estado: ResultadoCategoria,
  formData: FormData,
): Promise<ResultadoCategoria> {
  await exigirAdministrador()
  const nome = String(formData.get("nome") ?? "").trim()
  const pai = String(formData.get("pai") ?? "")
  if (!nome) return OK

  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("categorias").insert({ nome, categoria_pai_id: pai || null })
  return concluir(error)
}

export async function renomearCategoria(id: string, nome: string): Promise<ResultadoCategoria> {
  await exigirAdministrador()
  if (!nome.trim()) return OK
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("categorias").update({ nome: nome.trim() }).eq("id", id)
  return concluir(error)
}

export async function moverCategoria(id: string, paiId: string | null): Promise<ResultadoCategoria> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("categorias").update({ categoria_pai_id: paiId }).eq("id", id)
  return concluir(error)
}

export async function apagarCategoria(id: string): Promise<ResultadoCategoria> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("categorias").delete().eq("id", id)
  return concluir(error)
}

export async function criarMaterial(
  _estado: ResultadoCategoria,
  formData: FormData,
): Promise<ResultadoCategoria> {
  await exigirAdministrador()
  const nome = String(formData.get("nome") ?? "").trim()
  if (!nome) return OK
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("etiquetas").insert({ nome })
  return concluir(error)
}

export async function apagarMaterial(id: string): Promise<ResultadoCategoria> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("etiquetas").delete().eq("id", id)
  return concluir(error)
}
