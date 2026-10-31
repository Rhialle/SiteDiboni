"use server"

import { revalidatePath } from "next/cache"

import { exigirUsuario } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { unidadesDeDigitacao } from "@/lib/estoque/quantidade"
import { somarContagem } from "@/lib/inventario/contagem"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Devolve o que foi digitado quando há erro (o React limpa o formulário depois da ação).
export type EstadoContagem = { erro: string; sucesso: string; valores: Record<string, string> | null }

export async function contarItem(
  inventarioId: number,
  variacaoId: string,
  loteId: string | null,
  _estado: EstadoContagem,
  formData: FormData,
): Promise<EstadoContagem> {
  await exigirUsuario()
  const valores = Object.fromEntries([...formData.entries()].map(([chave, valor]) => [chave, String(valor)]))
  const falha = (erro: string): EstadoContagem => ({ erro, sucesso: "", valores })

  // As unidades vêm do banco, não do navegador: o fator usado na soma é sempre o da forma de venda.
  const supabase = await criarClienteServidor()
  const [{ data: variacao }, { data: formas }] = await Promise.all([
    supabase.from("variacoes").select("produtos(tipo_venda)").eq("id", variacaoId).maybeSingle(),
    supabase.from("formas_venda").select("id, nome, fator, peso_variavel, ativa").eq("variacao_id", variacaoId),
  ])
  if (!variacao) return falha(MENSAGENS.itemNaoExiste)
  const campos = Object.fromEntries(
    Object.entries(valores)
      .filter(([chave]) => chave.startsWith("q:"))
      .map(([chave, texto]) => [chave.slice(2), texto]),
  )
  const soma = somarContagem(campos, unidadesDeDigitacao(variacao.produtos.tipo_venda, formas ?? []))
  if (!soma.ok) return falha(soma.erro)

  const { error } = await supabase.rpc("contar_item", {
    p_inventario: inventarioId,
    p_variacao: variacaoId,
    p_lote: loteId as string,
    p_quantidade: soma.total,
    p_validade: (valores.validade || null) as string,
    p_codigo_lote: (valores.codigo || null) as string,
  })
  if (error) return falha(mensagemDoErroDoBanco(error))

  revalidatePath(`/inventario/${inventarioId}`)
  return { erro: "", sucesso: MENSAGENS.contagemSalva, valores: null }
}
