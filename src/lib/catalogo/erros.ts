import { MENSAGENS } from "@/lib/mensagens"

// Restrições do banco (repetição 23505 e item em uso 23503) e o texto que a pessoa vê.
const POR_RESTRICAO: Record<string, string> = {
  categorias_nome_por_pai: MENSAGENS.categoriaRepetida,
  etiquetas_nome_key: MENSAGENS.materialRepetido,
  variacoes_codigo_barras_key: MENSAGENS.codigoBarrasRepetido,
  variacoes_codigo_interno_key: MENSAGENS.codigoInternoRepetido,
  variacoes_atributos_por_produto: MENSAGENS.variacaoRepetida,
  faixas_preco_quantidade_key: MENSAGENS.faixaRepetida,
  compatibilidades_par_key: MENSAGENS.compatibilidadeRepetida,
  produto_categorias_categoria_id_fkey: MENSAGENS.categoriaEmUso,
  categorias_categoria_pai_id_fkey: MENSAGENS.categoriaEmUso,
  produto_etiquetas_etiqueta_id_fkey: MENSAGENS.materialEmUso,
}

export function mensagemDoErroDoBanco(erro: { code?: string; message: string }): string {
  // P0001 é uma regra do próprio banco, que já fala com a pessoa.
  if (erro.code === "P0001") return erro.message
  // Gravando algo que aponta para um item apagado nesse meio-tempo (ex.: categoria apagada em outra aba).
  if (erro.code === "23503" && erro.message.startsWith("insert or update on table")) return MENSAGENS.itemNaoExiste
  if (erro.code === "23505" || erro.code === "23503") {
    const restricao = Object.keys(POR_RESTRICAO).find((nome) => erro.message.includes(`"${nome}"`))
    if (restricao) return POR_RESTRICAO[restricao]
  }
  return MENSAGENS.acaoFalhou
}
