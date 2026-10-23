"use server"

import { redirect } from "next/navigation"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { gtinValido } from "@/lib/catalogo/gtin"
import {
  colunasDoProduto,
  lerCamposDoProduto,
  problemaDosCamposDoProduto,
  type CamposDoProduto,
} from "@/lib/catalogo/produto-form"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type PrimeiraVariacao = { nome: string; codigo_interno: string; codigo_barras: string }

export type EstadoProdutoNovo = {
  erro: string
  // O que a pessoa digitou, para não sumir quando houver erro.
  valores: { campos: CamposDoProduto; variacao: PrimeiraVariacao } | null
}

export async function criarProduto(
  _estado: EstadoProdutoNovo,
  formData: FormData,
): Promise<EstadoProdutoNovo> {
  await exigirAdministrador()

  const campos = lerCamposDoProduto(formData)
  const variacao: PrimeiraVariacao = {
    nome: String(formData.get("variacao_nome") ?? "").trim(),
    codigo_interno: String(formData.get("codigo_interno") ?? "").trim(),
    codigo_barras: String(formData.get("codigo_barras") ?? "").replace(/\D/g, ""),
  }
  const falha = (erro: string): EstadoProdutoNovo => ({ erro, valores: { campos, variacao } })

  const problema = problemaDosCamposDoProduto(campos)
  if (problema) return falha(problema)
  if (variacao.codigo_barras && !gtinValido(variacao.codigo_barras)) {
    return falha(MENSAGENS.codigoBarrasInvalido)
  }

  const supabase = await criarClienteServidor()
  const { data: id, error } = await supabase.rpc("criar_produto", {
    dados: {
      ...colunasDoProduto(campos),
      categorias: campos.categorias,
      etiquetas: campos.etiquetas,
      variacao,
    },
  })
  if (error) return falha(mensagemDoErroDoBanco(error))

  redirect(`/produtos/${id}`)
}
