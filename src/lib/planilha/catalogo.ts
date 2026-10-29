import { emOrdem } from "./celulas"
import type { CatalogoAtual, LinhaForma } from "./tipos"

// O jsonb de catalogo_para_planilha() no formato da planilha. As faixas viram linhas, como na aba
// Formas de venda (quantidade mínima 1 é o preço normal).

type VariacaoDoBanco = {
  produto_id: string
  produto: string
  variacao: string
  codigo_interno: string
  codigo_barras: string | null
  ncm: string | null
  categorias: string[]
  materiais: string[]
  tipo_venda: "unidade" | "peso"
  controla_validade: boolean
  apto_forno: boolean
  apto_freezer: boolean
  apto_microondas: boolean
  apto_alimento: boolean
  estoque_minimo: number
  comprimento_mm: number | null
  largura_mm: number | null
  altura_mm: number | null
  capacidade_ml: number | null
  tem_movimentacoes: boolean
  tem_saldo: boolean
  tem_formas: boolean
}

type FormaDoBanco = {
  codigo_interno: string
  forma: string
  fator: number
  preco_centavos: number
  faixas: { quantidade_minima: number; preco_centavos: number }[]
}

export function paraCatalogoAtual(json: unknown): CatalogoAtual {
  const dados = json as { variacoes: VariacaoDoBanco[]; formas: FormaDoBanco[] }
  return {
    variacoes: dados.variacoes.map((v) => ({
      produtoId: v.produto_id,
      produto: v.produto,
      variacao: v.variacao,
      codigoInterno: v.codigo_interno,
      codigoBarras: v.codigo_barras,
      ncm: v.ncm,
      categorias: emOrdem(v.categorias),
      materiais: emOrdem(v.materiais),
      tipoVenda: v.tipo_venda,
      controlaValidade: v.controla_validade,
      aptoForno: v.apto_forno,
      aptoFreezer: v.apto_freezer,
      aptoMicroondas: v.apto_microondas,
      aptoAlimento: v.apto_alimento,
      estoqueMinimo: Number(v.estoque_minimo),
      comprimentoMm: v.comprimento_mm,
      larguraMm: v.largura_mm,
      alturaMm: v.altura_mm,
      capacidadeMl: v.capacidade_ml,
      temMovimentacoes: v.tem_movimentacoes,
      temSaldo: v.tem_saldo,
      temFormas: v.tem_formas,
    })),
    formas: dados.formas.flatMap((f): Omit<LinhaForma, "linha">[] => {
      const linha = (quantidadeMinima: number, precoCentavos: number) => ({
        codigoInterno: f.codigo_interno,
        forma: f.forma,
        fator: Number(f.fator),
        quantidadeMinima,
        precoCentavos,
      })
      return [linha(1, f.preco_centavos), ...f.faixas.map((faixa) => linha(faixa.quantidade_minima, faixa.preco_centavos))]
    }),
  }
}
