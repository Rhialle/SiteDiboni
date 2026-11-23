// Leitura de código de barras pela câmera (fase 2.2).

// Os códigos de supermercado (EAN-13, EAN-8, UPC-A, UPC-E) e o de etiqueta interna (Code 128).
export const FORMATOS_LIDOS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] as const

// O código como a busca espera: sem espaços, quebras de linha nem caracteres de controle.
export function limparCodigoLido(texto: string): string {
  return texto.replace(/[\s\u0000-\u001f\u007f]/g, "")
}
