// Categorias guardadas como lista plana (com categoria_pai_id) e montadas em árvore para as telas.
export type CategoriaPlana = {
  id: string
  nome: string
  categoria_pai_id: string | null
  ordem: number
}

export type NoCategoria = CategoriaPlana & { filhas: NoCategoria[] }

export function montarArvore(categorias: CategoriaPlana[]): NoCategoria[] {
  const nos = new Map(categorias.map((c) => [c.id, { ...c, filhas: [] as NoCategoria[] }]))
  const raizes: NoCategoria[] = []
  for (const no of nos.values()) {
    const mae = no.categoria_pai_id ? nos.get(no.categoria_pai_id) : undefined
    if (mae) mae.filhas.push(no)
    else raizes.push(no)
  }
  const ordenar = (lista: NoCategoria[]) => {
    lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"))
    lista.forEach((no) => ordenar(no.filhas))
  }
  ordenar(raizes)
  return raizes
}

// "Bolos > Caixas para bolo", na ordem da árvore, para listas de escolha.
export function caminhosDasCategorias(arvore: NoCategoria[]): { id: string; caminho: string }[] {
  const saida: { id: string; caminho: string }[] = []
  const visitar = (nos: NoCategoria[], prefixo: string) => {
    for (const no of nos) {
      const caminho = prefixo ? `${prefixo} > ${no.nome}` : no.nome
      saida.push({ id: no.id, caminho })
      visitar(no.filhas, caminho)
    }
  }
  visitar(arvore, "")
  return saida
}
