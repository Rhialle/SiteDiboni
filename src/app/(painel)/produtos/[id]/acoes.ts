"use server"

import { revalidatePath } from "next/cache"

import { exigirAdministrador } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { combinacoesDaGrade, lerGrade } from "@/lib/catalogo/grade"
import { gtinValido } from "@/lib/catalogo/gtin"
import {
  colunasDoProduto,
  lerCamposDoProduto,
  problemaDosCamposDoProduto,
  type CamposDoProduto,
} from "@/lib/catalogo/produto-form"
import { reaisParaCentavos } from "@/lib/formatacao"
import { MENSAGENS, mensagemGradeCriada } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type EstadoFicha = { erro: string; sucesso: string }

const falha = (erro: string): EstadoFicha => ({ erro, sucesso: "" })

function concluir(
  produtoId: string,
  erro: { code?: string; message: string } | null,
  sucesso: string = MENSAGENS.salvo,
): EstadoFicha {
  if (erro) return falha(mensagemDoErroDoBanco(erro))
  revalidatePath(`/produtos/${produtoId}`)
  return { erro: "", sucesso }
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim()
}

// Número inteiro opcional: vazio vira nulo; qualquer outra coisa precisa ser inteiro >= mínimo.
function inteiroOpcional(valor: string, minimo: number): number | null | undefined {
  if (valor === "") return null
  return /^\d+$/.test(valor) && Number(valor) >= minimo ? Number(valor) : undefined
}

function centavos(valor: string): number | null {
  try {
    return reaisParaCentavos(valor)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Dados do produto
// ---------------------------------------------------------------------------

export type EstadoDados = EstadoFicha & { valores: CamposDoProduto | null }

export async function salvarDadosGerais(
  produtoId: string,
  _estado: EstadoDados,
  formData: FormData,
): Promise<EstadoDados> {
  await exigirAdministrador()
  const campos = lerCamposDoProduto(formData)
  const problema = problemaDosCamposDoProduto(campos)
  if (problema) return { erro: problema, sucesso: "", valores: campos }

  // Dados, categorias e materiais numa chamada só: se algo falha, nada muda.
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc("atualizar_produto", {
    p_produto: produtoId,
    dados: { ...colunasDoProduto(campos), categorias: campos.categorias, etiquetas: campos.etiquetas },
  })
  if (error) return { erro: mensagemDoErroDoBanco(error), sucesso: "", valores: campos }

  revalidatePath(`/produtos/${produtoId}`)
  return { erro: "", sucesso: MENSAGENS.salvo, valores: null }
}

// ---------------------------------------------------------------------------
// Variações e grade
// ---------------------------------------------------------------------------

export async function salvarVariacao(
  produtoId: string,
  _estado: EstadoFicha,
  formData: FormData,
): Promise<EstadoFicha> {
  await exigirAdministrador()
  const variacaoId = texto(formData, "variacao_id")
  const codigoBarras = texto(formData, "codigo_barras").replace(/\D/g, "")
  if (codigoBarras && !gtinValido(codigoBarras)) return falha(MENSAGENS.codigoBarrasInvalido)

  const medidas = {
    comprimento_mm: inteiroOpcional(texto(formData, "comprimento_mm"), 1),
    largura_mm: inteiroOpcional(texto(formData, "largura_mm"), 1),
    altura_mm: inteiroOpcional(texto(formData, "altura_mm"), 1),
    capacidade_ml: inteiroOpcional(texto(formData, "capacidade_ml"), 1),
  }
  if (Object.values(medidas).includes(undefined)) return falha(MENSAGENS.medidaInvalida)
  const estoqueMinimo = inteiroOpcional(texto(formData, "estoque_minimo") || "0", 0)
  if (estoqueMinimo === undefined || estoqueMinimo === null) return falha(MENSAGENS.estoqueMinimoInvalido)

  const codigoInterno = texto(formData, "codigo_interno")
  const linha = {
    nome: texto(formData, "nome") || "Padrão",
    codigo_barras: codigoBarras || null,
    ...(codigoInterno ? { codigo_interno: codigoInterno } : {}),
    ...(medidas as Record<string, number | null>),
    estoque_minimo: estoqueMinimo,
  }

  const supabase = await criarClienteServidor()
  const { error } = variacaoId
    ? await supabase.from("variacoes").update(linha).eq("id", variacaoId)
    : await supabase.from("variacoes").insert({ ...linha, produto_id: produtoId })
  return concluir(produtoId, error)
}

export async function alterarVariacaoAtiva(
  produtoId: string,
  variacaoId: string,
  ativa: boolean,
): Promise<EstadoFicha> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("variacoes").update({ ativa }).eq("id", variacaoId)
  return concluir(produtoId, error)
}

// Devolve o texto da grade para ele continuar no campo depois de gerar (o React limpa o formulário).
export type EstadoGrade = EstadoFicha & { texto: string }

export async function gerarGrade(
  produtoId: string,
  _estado: EstadoGrade,
  formData: FormData,
): Promise<EstadoGrade> {
  await exigirAdministrador()
  const textoDaGrade = texto(formData, "grade")
  let grade
  try {
    grade = lerGrade(textoDaGrade)
  } catch {
    return { ...falha(MENSAGENS.gradeInvalida), texto: textoDaGrade }
  }

  // O banco cria só as combinações que ainda não existem (repetir ou clicar duas vezes não duplica).
  const supabase = await criarClienteServidor()
  const { data: criadas, error } = await supabase.rpc("gerar_grade", {
    p_produto: produtoId,
    p_variacoes: combinacoesDaGrade(grade),
  })
  return { ...concluir(produtoId, error, mensagemGradeCriada(criadas ?? 0)), texto: textoDaGrade }
}

// ---------------------------------------------------------------------------
// Formas de venda, faixas e preço por kg
// ---------------------------------------------------------------------------

export async function salvarFormaVenda(
  produtoId: string,
  variacaoId: string,
  _estado: EstadoFicha,
  formData: FormData,
): Promise<EstadoFicha> {
  await exigirAdministrador()
  const fator = inteiroOpcional(texto(formData, "fator"), 1)
  if (!fator) return falha(MENSAGENS.quantidadeInvalida)
  const preco = centavos(texto(formData, "preco"))
  if (preco === null) return falha(MENSAGENS.precoInvalido)

  const supabase = await criarClienteServidor()
  const { error } = await supabase
    .from("formas_venda")
    .insert({ variacao_id: variacaoId, nome: texto(formData, "nome"), fator, preco_centavos: preco })
  return concluir(produtoId, error)
}

export async function alterarFormaAtiva(
  produtoId: string,
  formaId: string,
  ativa: boolean,
): Promise<EstadoFicha> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("formas_venda").update({ ativa }).eq("id", formaId)
  return concluir(produtoId, error)
}

export async function salvarFaixa(
  produtoId: string,
  formaId: string,
  _estado: EstadoFicha,
  formData: FormData,
): Promise<EstadoFicha> {
  await exigirAdministrador()
  const quantidade = inteiroOpcional(texto(formData, "quantidade_minima"), 2)
  if (!quantidade) return falha(MENSAGENS.faixaMinima)
  const preco = centavos(texto(formData, "preco"))
  if (preco === null) return falha(MENSAGENS.precoInvalido)

  const supabase = await criarClienteServidor()
  const { error } = await supabase
    .from("faixas_preco")
    .insert({ forma_venda_id: formaId, quantidade_minima: quantidade, preco_centavos: preco })
  return concluir(produtoId, error)
}

export async function apagarFaixa(produtoId: string, faixaId: string): Promise<EstadoFicha> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("faixas_preco").delete().eq("id", faixaId)
  return concluir(produtoId, error)
}

// Produto por peso: cada variação tem só a forma "Granel", com preço por kg (fator 1000 g).
export async function salvarPrecoPorKg(
  produtoId: string,
  variacaoId: string,
  _estado: EstadoFicha,
  formData: FormData,
): Promise<EstadoFicha> {
  await exigirAdministrador()
  const preco = centavos(texto(formData, "preco"))
  if (preco === null) return falha(MENSAGENS.precoInvalido)

  const supabase = await criarClienteServidor()
  const { data: granel } = await supabase
    .from("formas_venda")
    .select("id")
    .eq("variacao_id", variacaoId)
    .eq("peso_variavel", true)
    .maybeSingle()
  const { error } = granel
    ? await supabase.from("formas_venda").update({ preco_centavos: preco, ativa: true }).eq("id", granel.id)
    : await supabase.from("formas_venda").insert({
        variacao_id: variacaoId,
        nome: "Granel",
        fator: 1000,
        preco_centavos: preco,
        peso_variavel: true,
      })
  return concluir(produtoId, error)
}


// ---------------------------------------------------------------------------
// Fotos, compatibilidades e inativação
// ---------------------------------------------------------------------------

// O navegador já enviou o arquivo para o bucket; aqui só se grava a linha (o banco limita a 8).
export async function registrarFoto(produtoId: string, caminho: string): Promise<EstadoFicha> {
  await exigirAdministrador()
  if (!caminho.startsWith(`${produtoId}/`)) return falha(MENSAGENS.acaoFalhou)

  const supabase = await criarClienteServidor()
  const { data: ultima } = await supabase
    .from("fotos")
    .select("ordem")
    .eq("produto_id", produtoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle()
  const { error } = await supabase
    .from("fotos")
    .insert({ produto_id: produtoId, caminho, ordem: (ultima?.ordem ?? -1) + 1 })
  return concluir(produtoId, error)
}

export async function apagarFoto(produtoId: string, fotoId: string): Promise<EstadoFicha> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { data: foto, error } = await supabase.from("fotos").delete().eq("id", fotoId).select("caminho").single()
  if (error) return falha(mensagemDoErroDoBanco(error))
  await supabase.storage.from("fotos-produtos").remove([foto.caminho])
  return concluir(produtoId, null)
}

export async function moverFoto(
  produtoId: string,
  fotoId: string,
  direcao: "antes" | "depois",
): Promise<EstadoFicha> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { data: fotos, error } = await supabase
    .from("fotos")
    .select("id, ordem")
    .eq("produto_id", produtoId)
    .order("ordem")
  if (error) return falha(mensagemDoErroDoBanco(error))

  const indice = fotos.findIndex((f) => f.id === fotoId)
  const vizinha = fotos[direcao === "antes" ? indice - 1 : indice + 1]
  if (indice < 0 || !vizinha) return { erro: "", sucesso: "" }

  // Troca as posições: depois da troca, a ordem fica 0, 1, 2… sem buracos.
  const novaOrdem = fotos.map((f) => f.id)
  novaOrdem[indice] = vizinha.id
  novaOrdem[fotos.indexOf(vizinha)] = fotoId
  for (const [ordem, id] of novaOrdem.entries()) {
    const { error: erroOrdem } = await supabase.from("fotos").update({ ordem }).eq("id", id)
    if (erroOrdem) return falha(mensagemDoErroDoBanco(erroOrdem))
  }
  return concluir(produtoId, null)
}

export async function ligarCompatibilidade(
  produtoId: string,
  _estado: EstadoFicha,
  formData: FormData,
): Promise<EstadoFicha> {
  await exigirAdministrador()
  const variacaoId = texto(formData, "variacao_id")
  const codigo = texto(formData, "codigo")

  // Código exato (sem curingas), sem diferenciar maiúsculas; erro na busca não vira "não encontrada".
  const supabase = await criarClienteServidor()
  const { data: outraId, error: erroBusca } = await supabase.rpc("variacao_por_codigo", { p_codigo: codigo })
  if (erroBusca) return falha(mensagemDoErroDoBanco(erroBusca))
  if (!outraId) return falha(MENSAGENS.variacaoNaoEncontrada)
  if (outraId === variacaoId) return falha(MENSAGENS.compatibilidadeMesma)

  const { error } = await supabase.from("compatibilidades").insert({
    variacao_a_id: variacaoId,
    variacao_b_id: outraId,
    descricao: texto(formData, "descricao"),
  })
  return concluir(produtoId, error)
}

export async function desligarCompatibilidade(produtoId: string, id: string): Promise<EstadoFicha> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("compatibilidades").delete().eq("id", id)
  return concluir(produtoId, error)
}

export async function alterarInativo(produtoId: string, inativo: boolean): Promise<EstadoFicha> {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from("produtos").update({ inativo }).eq("id", produtoId)
  return concluir(produtoId, error)
}
