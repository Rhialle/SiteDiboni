"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { MENSAGENS, mensagemPlanilhaImportada, mensagemPreviaPlanilha } from "@/lib/mensagens"
import { paraCatalogoAtual } from "@/lib/planilha/catalogo"
import { TAMANHO_MAXIMO_PLANILHA } from "@/lib/planilha/colunas"
import { conferirPlanilha } from "@/lib/planilha/conferir"
import { lerPlanilha } from "@/lib/planilha/ler"
import type { ErroDaPlanilha, Previa } from "@/lib/planilha/tipos"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type ResultadoDaPlanilha = {
  erro: string
  sucesso: string
  resumo: string
  erros: ErroDaPlanilha[]
  podeImportar: boolean
}

const VAZIO: ResultadoDaPlanilha = { erro: "", sucesso: "", resumo: "", erros: [], podeImportar: false }

// Lê o arquivo e compara com o catálogo de agora. As duas ações chamam isto: a importação não confia
// numa prévia antiga.
async function conferirArquivo(formData: FormData): Promise<{ previa: Previa } | { erro: string }> {
  const arquivo = formData.get("planilha")
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: MENSAGENS.planilhaNenhuma }
  if (arquivo.size > TAMANHO_MAXIMO_PLANILHA) return { erro: MENSAGENS.planilhaGrande }
  const lida = await lerPlanilha(await arquivo.arrayBuffer())
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc("catalogo_para_planilha")
  if (error) return { erro: mensagemDoErroDoBanco(error) }
  return { previa: conferirPlanilha(lida, paraCatalogoAtual(data)) }
}

function paraResultado(previa: Previa): ResultadoDaPlanilha {
  return {
    ...VAZIO,
    resumo: mensagemPreviaPlanilha(previa.criados, previa.atualizados, previa.semMudanca),
    erros: previa.erros,
    podeImportar: previa.dados !== null,
  }
}

export async function preverPlanilha(_estado: ResultadoDaPlanilha, formData: FormData): Promise<ResultadoDaPlanilha> {
  await exigirAdministrador()
  const conferida = await conferirArquivo(formData)
  return "erro" in conferida ? { ...VAZIO, erro: conferida.erro } : paraResultado(conferida.previa)
}

export async function gravarPlanilha(_estado: ResultadoDaPlanilha, formData: FormData): Promise<ResultadoDaPlanilha> {
  await exigirAdministrador()
  const conferida = await conferirArquivo(formData)
  if ("erro" in conferida) return { ...VAZIO, erro: conferida.erro }
  const { previa } = conferida
  // Com erro ou sem nada a fazer, volta a prévia (o catálogo pode ter mudado desde a conferência).
  if (!previa.dados) return paraResultado(previa)

  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("importar_planilha", { dados: previa.dados })
  if (error) return { ...paraResultado(previa), podeImportar: false, erro: mensagemDoErroDoBanco(error) }

  revalidatePath("/produtos")
  return { ...VAZIO, sucesso: mensagemPlanilhaImportada(previa.criados, previa.atualizados) }
}
