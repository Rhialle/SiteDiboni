export function exigirVariavel(valor: string | undefined, nome: string): string {
  if (!valor) throw new Error(`Variável de ambiente ${nome} não configurada.`)
  return valor
}

// As variáveis NEXT_PUBLIC_ precisam aparecer escritas por extenso para o
// Next.js colocá-las no código que roda no navegador.
export function urlSupabase(): string {
  return exigirVariavel(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL")
}

export function chavePublicavel(): string {
  return exigirVariavel(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  )
}

export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
