// Formatos da planilha do catálogo (seção 9.2 da especificação): as linhas lidas, o catálogo atual
// para comparar e o que vai para a função importar_planilha do banco.

export type Aba = "Variações" | "Formas de venda"

export type ErroDaPlanilha = { aba: Aba | null; linha: number | null; coluna: string | null; mensagem: string }

export type LinhaVariacao = {
  linha: number
  produto: string
  variacao: string
  codigoInterno: string
  codigoBarras: string | null
  ncm: string | null
  categorias: string[]
  materiais: string[]
  tipoVenda: "unidade" | "peso"
  controlaValidade: boolean
  aptoForno: boolean
  aptoFreezer: boolean
  aptoMicroondas: boolean
  aptoAlimento: boolean
  estoqueMinimo: number
  comprimentoMm: number | null
  larguraMm: number | null
  alturaMm: number | null
  capacidadeMl: number | null
}

export type LinhaForma = {
  linha: number
  codigoInterno: string
  forma: string
  fator: number
  quantidadeMinima: number
  precoCentavos: number
}

export type PlanilhaLida = { variacoes: LinhaVariacao[]; formas: LinhaForma[]; erros: ErroDaPlanilha[] }

export type VariacaoAtual = Omit<LinhaVariacao, "linha"> & {
  produtoId: string
  temMovimentacoes: boolean
  temSaldo: boolean
  temFormas: boolean
}

// As formas ativas, uma linha por preço (quantidade mínima 1 = preço normal), como na planilha.
export type CatalogoAtual = { variacoes: VariacaoAtual[]; formas: Omit<LinhaForma, "linha">[] }

export type DadosDaImportacao = {
  produtos: {
    id: string | null
    nome: string
    ncm: string | null
    tipo_venda: "unidade" | "peso"
    controla_validade: boolean
    apto_forno: boolean
    apto_freezer: boolean
    apto_microondas: boolean
    apto_alimento: boolean
    categorias: string[]
    materiais: string[]
    variacoes: {
      codigo_interno: string
      nome: string
      codigo_barras: string | null
      estoque_minimo: number
      comprimento_mm: number | null
      largura_mm: number | null
      altura_mm: number | null
      capacidade_ml: number | null
    }[]
  }[]
  formas: {
    codigo_interno: string
    formas: {
      nome: string
      fator: number
      preco_centavos: number
      faixas: { quantidade_minima: number; preco_centavos: number }[]
    }[]
  }[]
}

export type Previa = {
  criados: number
  atualizados: number
  semMudanca: number
  erros: ErroDaPlanilha[]
  dados: DadosDaImportacao | null
}
