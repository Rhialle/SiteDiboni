"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador, exigirUsuario } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import {
  custoUnitarioBase,
  escolherUnidade,
  paraUnidadeBase,
  unidadesDeDigitacao,
  type UnidadeDeDigitacao,
} from "@/lib/estoque/quantidade"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import type { Database } from "@/lib/supabase/tipos"

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
  return escolherUnidade(unidadesDeDigitacao(variacao.produtos.tipo_venda, formas ?? []), valor)
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
  if (!unidade) return falha(MENSAGENS.unidadeMudou)

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

type TipoMovimentacao = Database["public"]["Enums"]["tipo_movimentacao"]

// Opção da tela → tipo no banco e sentido (as perdas e a saída tiram do estoque).
const TIPOS: Record<string, [TipoMovimentacao, 1 | -1]> = {
  perda_avaria: ["perda_avaria", -1],
  perda_vencimento: ["perda_vencimento", -1],
  quebra_pesagem: ["quebra_pesagem", -1],
  ajuste_entrou: ["ajuste_manual", 1],
  ajuste_saiu: ["ajuste_manual", -1],
}

export async function registrarPerdaOuAjuste(
  variacaoId: string,
  _estado: EstadoEstoque,
  formData: FormData,
): Promise<EstadoEstoque> {
  await exigirUsuario()
  const valores = lerCampos(formData, ["lote", "tipo", "quantidade", "em", "motivo"])
  const falha = (erro: string): EstadoEstoque => ({ erro, sucesso: "", valores })

  const supabase = await criarClienteServidor()
  const unidade = await unidadeEscolhida(supabase, variacaoId, valores.em)
  if (!unidade) return falha(MENSAGENS.unidadeMudou)
  const quantidade = paraUnidadeBase(valores.quantidade, unidade.fator, unidade.casas)
  if (quantidade === null) return falha(unidade.casas === 3 ? MENSAGENS.pesoInvalido : MENSAGENS.quantidadeInvalida)
  const escolha = TIPOS[valores.tipo]
  if (!escolha) return falha(MENSAGENS.tipoPerdaInvalido)

  const [tipo, sentido] = escolha
  const { data, error } = await supabase.rpc("registrar_perda_ou_ajuste", {
    p_variacao: variacaoId,
    // Sem lote: o banco usa o lote único do produto sem validade (e recusa nos outros).
    p_lote: (valores.lote || null) as string,
    p_tipo: tipo,
    p_quantidade: sentido * quantidade,
    p_motivo: valores.motivo,
  })
  if (error) return falha(mensagemDoErroDoBanco(error))

  revalidatePath(`/estoque/${variacaoId}`)
  const sucesso = data === "solicitacao" ? MENSAGENS.virouSolicitacao : MENSAGENS.movimentacaoRegistrada
  return { erro: "", sucesso, valores: null }
}
