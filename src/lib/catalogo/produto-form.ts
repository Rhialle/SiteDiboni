import { MENSAGENS } from "@/lib/mensagens"

// Campos do produto compartilhados pelo cadastro de produto novo e pela ficha.
export const CAMPOS_MARCAVEIS = [
  "controla_validade",
  "apto_forno",
  "apto_freezer",
  "apto_microondas",
  "apto_alimento",
] as const

export type CamposDoProduto = {
  nome: string
  descricao: string
  tipo_venda: "unidade" | "peso"
  ncm: string
  cest: string
  origem_fiscal: string
  categorias: string[]
  etiquetas: string[]
  marcados: string[]
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim()
}

export function lerCamposDoProduto(formData: FormData): CamposDoProduto {
  return {
    nome: texto(formData, "nome"),
    descricao: texto(formData, "descricao"),
    tipo_venda: texto(formData, "tipo_venda") === "peso" ? "peso" : "unidade",
    ncm: texto(formData, "ncm").replace(/\D/g, ""),
    cest: texto(formData, "cest").replace(/\D/g, ""),
    origem_fiscal: texto(formData, "origem_fiscal"),
    categorias: formData.getAll("categorias").map(String),
    etiquetas: formData.getAll("etiquetas").map(String),
    marcados: CAMPOS_MARCAVEIS.filter((campo) => formData.get(campo) === "on"),
  }
}

export function problemaDosCamposDoProduto(campos: CamposDoProduto): string | null {
  if (campos.ncm && !/^\d{8}$/.test(campos.ncm)) return MENSAGENS.ncmInvalido
  if (campos.cest && !/^\d{7}$/.test(campos.cest)) return MENSAGENS.cestInvalido
  return null
}

// Colunas da tabela produtos a partir dos campos do formulário.
export function colunasDoProduto(campos: CamposDoProduto) {
  return {
    nome: campos.nome,
    descricao: campos.descricao,
    tipo_venda: campos.tipo_venda,
    ncm: campos.ncm || null,
    cest: campos.cest || null,
    origem_fiscal: campos.origem_fiscal === "" ? null : Number(campos.origem_fiscal),
    ...Object.fromEntries(CAMPOS_MARCAVEIS.map((campo) => [campo, campos.marcados.includes(campo)])),
  }
}
