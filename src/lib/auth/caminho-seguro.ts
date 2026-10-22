// Só deixa seguir para páginas do próprio site (evita links que mandam para sites falsos).
export function caminhoSeguro(caminho: string | null | undefined, padrao: string): string {
  if (!caminho || !caminho.startsWith("/") || caminho.startsWith("//") || caminho.startsWith("/\\")) {
    return padrao
  }
  return caminho
}
