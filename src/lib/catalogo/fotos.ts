import { MENSAGENS } from "@/lib/mensagens"

// Mesmos limites do bucket fotos-produtos no Supabase.
export const TIPOS_DE_FOTO = ["image/jpeg", "image/png", "image/webp"]
export const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024

export function problemaDaFoto(arquivo: { type: string; size: number }): string | null {
  if (!TIPOS_DE_FOTO.includes(arquivo.type)) return MENSAGENS.fotoFormato
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) return MENSAGENS.fotoGrande
  return null
}
