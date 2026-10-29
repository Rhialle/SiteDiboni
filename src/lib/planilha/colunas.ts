import type { Aba } from "./tipos"

// Abas e colunas do modelo, na ordem em que o sistema escreve. A leitura acha cada coluna pelo nome.
export const ABA_VARIACOES: Aba = "Variações"
export const ABA_FORMAS: Aba = "Formas de venda"

export const COLUNAS_VARIACOES = [
  "Produto",
  "Variação",
  "Código interno",
  "Código de barras",
  "NCM",
  "Categorias",
  "Materiais",
  "Tipo de venda",
  "Controla validade",
  "Forno",
  "Freezer",
  "Micro-ondas",
  "Alimento",
  "Estoque mínimo (un ou g)",
  "Comprimento (mm)",
  "Largura (mm)",
  "Altura (mm)",
  "Capacidade (ml)",
] as const

export const COLUNAS_FORMAS = ["Código interno", "Forma", "Fator", "Quantidade mínima", "Preço (R$)"] as const

export const MAXIMO_LINHAS = 5000
export const TAMANHO_MAXIMO_PLANILHA = 4 * 1024 * 1024
