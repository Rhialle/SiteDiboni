"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { custoUnitarioBase, paraUnidadeBase, unidadesDeDigitacao, type UnidadeDeDigitacao } from "@/lib/estoque/quantidade"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Devolve o que foi digitado quando há erro (o React limpa o formulário depois da ação).
export type EstadoEstoque = { erro: string; sucesso: string; valores: Record<string, string> | null }

type Supabase = Awaited<ReturnType<typeof criarClienteServidor>>

function lerCampos(formData: FormData, campos: string[]): Record<string, string> {
  return Object.fromEntries(campos.map((campo) => [campo, String(formData.get(campo) ?? "").trim()]))
}

// As unidades vêm do banco, não do navegador: o fator usado na conta é sempre o da forma de venda.
async function unidadeEscolhida(supabase: Supabase, variacaoId: string, valor: string): Promise<UnidadeDeDigitacao | null> {
  const [{ data: variacao }, { data: formas }] = await Promise.all([
    supabase.from("variacoes").select("produtos(tipo_venda)").eq("id", variacaoId).maybeSingle(),
    supabase.from("formas_venda").select("id, nome, fator, peso_variavel, ativa").eq("variacao_id", variacaoId),
  ])
  if (!variacao) return null
  const unidades = unidadesDeDigitacao(variacao.produtos.tipo_venda, formas ?? [])
  return unidades.find((unidade) => unidade.valor === valor) ?? unidades[0]
}

export async function registrarEntrada(
  variacaoId: string,
  _estado: EstadoEstoque,
  formData: FormData,
): Promise<EstadoEstoque> {
  await exigirAdministrador()
  const valores = lerCampos(formData, ["quantidade", "em", "custo", "validade", "lote", "motivo"])
  const falha = (erro: string): EstadoEstoque => ({ erro, sucesso: "", valores })

  const supabase = await criarClienteServidor()
  const unidade = await unidadeEscolhida(supabase, variacaoId, valores.em)
  if (!unidade) return falha(MENSAGENS.acaoFalhou)

  const quantidade = paraUnidadeBase(valores.quantidade, unidade.fator, unidade.casas)
  if (quantidade === null) return falha(unidade.casas === 3 ? MENSAGENS.pesoInvalido : MENSAGENS.quantidadeInvalida)
  if (valores.custo === "") return falha(MENSAGENS.custoObrigatorio)
  const custo = custoUnitarioBase(valores.custo, unidade.fator)
  if (custo === null) return falha(MENSAGENS.custoInvalido)

  const { error } = await supabase.rpc("registrar_entrada_manual", {
    p_variacao: variacaoId,
    p_quantidade: quantidade,
    p_custo_unitario: Number(custo),
    p_motivo: valores.motivo,
    p_validade: valores.validade || undefined,
    p_codigo_lote: valores.lote || undefined,
  })
  if (error) return falha(mensagemDoErroDoBanco(error))

  revalidatePath(`/estoque/${variacaoId}`)
  return { erro: "", sucesso: MENSAGENS.entradaRegistrada, valores: null }
}
