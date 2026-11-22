"use server"

import { revalidatePath } from "next/cache"

import { exigirUsuario } from "@/lib/auth/sessao"
import type { paraEnvio } from "@/lib/balcao/carrinho"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import type { Database } from "@/lib/supabase/tipos"

export type ItemParaVenda = Database["public"]["Functions"]["buscar_para_venda"]["Returns"][number]

export async function buscarParaVenda(termo: string): Promise<{ itens: ItemParaVenda[] } | { erro: string }> {
  await exigirUsuario()
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc("buscar_para_venda", { p_termo: termo })
  if (error) return { erro: mensagemDoErroDoBanco(error) }
  return { itens: data ?? [] }
}

export async function concluirVenda(
  envio: ReturnType<typeof paraEnvio>,
): Promise<{ numero: number; trocoCentavos: number } | { erro: string }> {
  await exigirUsuario()
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc("registrar_venda", envio).single()
  if (error) return { erro: mensagemDoErroDoBanco(error) }
  revalidatePath("/caixa")
  revalidatePath("/vendas")
  revalidatePath("/estoque")
  revalidatePath("/inicio")
  return { numero: data.numero, trocoCentavos: data.troco_centavos }
}
