"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { reaisParaCentavos } from "@/lib/formatacao"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import { cnpjValido, normalizarCnpj } from "@/lib/validacao/cnpj"
import { lerDiasDeAlerta } from "@/lib/validacao/dias-alerta"

export type ValoresConfiguracoes = { cnpj: string; limite: string; dias: string }

export type EstadoConfiguracoes = {
  erro: string
  sucesso: string
  // O que a pessoa digitou, para não sumir quando houver erro.
  valores: ValoresConfiguracoes | null
}

export async function salvarConfiguracoes(
  _estado: EstadoConfiguracoes,
  formData: FormData,
): Promise<EstadoConfiguracoes> {
  await exigirAdministrador()

  const valores: ValoresConfiguracoes = {
    cnpj: String(formData.get("cnpj") ?? "").trim(),
    limite: String(formData.get("limite") ?? "").trim(),
    dias: String(formData.get("dias") ?? "").trim(),
  }
  const falha = (erro: string): EstadoConfiguracoes => ({ erro, sucesso: "", valores })

  const cnpj = valores.cnpj ? normalizarCnpj(valores.cnpj) : null
  if (cnpj && !cnpjValido(cnpj)) return falha(MENSAGENS.cnpjInvalido)

  let limite: number
  let dias: number[]
  try {
    limite = reaisParaCentavos(valores.limite)
  } catch {
    return falha(MENSAGENS.limiteInvalido)
  }
  try {
    dias = lerDiasDeAlerta(valores.dias)
  } catch {
    return falha(MENSAGENS.diasInvalidos)
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase
    .from("configuracoes")
    .update({ cnpj_loja: cnpj, limite_ajuste_centavos: limite, dias_alerta_validade: dias })
    .eq("id", 1)
  if (error) return falha(MENSAGENS.acaoFalhou)

  revalidatePath("/configuracoes")
  return { erro: "", sucesso: MENSAGENS.configuracoesSalvas, valores: null }
}
