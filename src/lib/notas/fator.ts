// Fator da ligação: quantas unidades base (un ou g) vêm em 1 unidade da nota (1 CX = 100 un).
export function lerFator(texto: string): number | null {
  const limpo = texto.trim()
  if (!/^\d{1,9}$/.test(limpo)) return null
  const fator = Number(limpo)
  return fator > 0 ? fator : null
}

// R6: quantidade da nota × fator precisa dar inteiro. A conta é em inteiros ("2.5000" vira 25000 ÷ 10⁴),
// para 0,1 × 10 não errar por arredondamento.
export function daInteiro(quantidade: string | number, fator: number): boolean {
  const [inteiros, decimais = ""] = String(quantidade).split(".")
  const escala = BigInt(10 ** decimais.length)
  return (BigInt(inteiros + decimais) * BigInt(fator)) % escala === BigInt(0)
}

// "2.5000" → "2,5", igual a quantidade_para_mensagem do banco.
export function quantidadeDaNota(quantidade: string | number): string {
  const texto = String(quantidade)
  const semZeros = texto.includes(".") ? texto.replace(/0+$/, "").replace(/\.$/, "") : texto
  return semZeros.replace(".", ",")
}
