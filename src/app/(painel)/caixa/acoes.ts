"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { exigirAdministrador, exigirUsuario } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { reaisParaCentavos } from "@/lib/formatacao"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type EstadoCaixa = { erro: string; sucesso: string }

const falha = (erro: string): EstadoCaixa => ({ erro, sucesso: "" })

// Vazio vira null (campo opcional); texto que não é dinheiro vira erro.
function centavos(formData: FormData, nome: string, obrigatorio: boolean): number | null | "invalido" {
  const texto = String(formData.get(nome) ?? "").trim()
  if (!texto) return obrigatorio ? "invalido" : null
  try {
    return reaisParaCentavos(texto)
  } catch {
    return "invalido"
  }
}

export async function abrirCaixa(_estado: EstadoCaixa, formData: FormData): Promise<EstadoCaixa> {
  await exigirUsuario()
  const troco = centavos(formData, "troco", true)
  if (troco === "invalido" || troco === null) return falha(MENSAGENS.valorInvalido)
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("abrir_caixa", { p_troco_inicial_centavos: troco })
  if (error) return falha(mensagemDoErroDoBanco(error))
  revalidatePath("/caixa")
  revalidatePath("/balcao")
  return { erro: "", sucesso: MENSAGENS.caixaAberto }
}

export async function registrarMovimento(_estado: EstadoCaixa, formData: FormData): Promise<EstadoCaixa> {
  await exigirUsuario()
  const tipo = String(formData.get("tipo") ?? "")
  if (tipo !== "retirada" && tipo !== "reforco") return falha(MENSAGENS.acaoFalhou)
  const valor = centavos(formData, "valor", true)
  if (valor === "invalido" || valor === null) return falha(MENSAGENS.valorInvalido)
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("registrar_movimento_caixa", {
    p_tipo: tipo,
    p_valor_centavos: valor,
    p_motivo: String(formData.get("motivo") ?? ""),
  })
  if (error) return falha(mensagemDoErroDoBanco(error))
  revalidatePath("/caixa")
  return { erro: "", sucesso: tipo === "retirada" ? MENSAGENS.retiradaRegistrada : MENSAGENS.reforcoRegistrado }
}

// Às cegas: quem fecha informa o contado; o esperado só aparece no resumo, depois de gravar.
export async function fecharCaixa(_estado: EstadoCaixa, formData: FormData): Promise<EstadoCaixa> {
  await exigirUsuario()
  const dinheiro = centavos(formData, "dinheiro", true)
  if (dinheiro === "invalido" || dinheiro === null) return falha(MENSAGENS.dinheiroContado)
  const outros = ["credito", "debito", "pix"].map((nome) => centavos(formData, nome, false))
  if (outros.includes("invalido")) return falha(MENSAGENS.valorInvalido)
  const [credito, debito, pix] = outros as (number | null)[]

  const supabase = await criarClienteServidor()
  const { data: aberto, error: erroAberto } = await supabase.rpc("caixa_aberto")
  if (erroAberto) return falha(mensagemDoErroDoBanco(erroAberto))
  const caixaId = aberto?.[0]?.id
  if (!caixaId) return falha(MENSAGENS.semCaixaAberto)
  const { error } = await supabase.rpc("fechar_caixa", {
    p_dinheiro_centavos: dinheiro,
    p_credito_centavos: credito ?? undefined,
    p_debito_centavos: debito ?? undefined,
    p_pix_centavos: pix ?? undefined,
  })
  if (error) return falha(mensagemDoErroDoBanco(error))
  revalidatePath("/caixa")
  revalidatePath("/balcao")
  revalidatePath("/inicio")
  redirect(`/caixa/${caixaId}`)
}

export async function conferirCaixa(caixaId: number): Promise<EstadoCaixa> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("conferir_caixa", { p_caixa: caixaId })
  if (error) return falha(mensagemDoErroDoBanco(error))
  revalidatePath(`/caixa/${caixaId}`)
  revalidatePath("/caixa")
  revalidatePath("/inicio")
  return { erro: "", sucesso: MENSAGENS.caixaConferido }
}
