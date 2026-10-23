// Reajuste digitado como "10", "-5", "+3" ou "2,5" (com ou sem "%"). Menos de -100% não existe.
export function lerPercentual(texto: string): number {
  const limpo = texto.replace(/%/g, "").replace(/\s/g, "").replace(",", ".")
  if (!/^[+-]?\d+(\.\d+)?$/.test(limpo)) throw new Error("Percentual inválido")
  const percentual = Number(limpo)
  if (percentual <= -100) throw new Error("Percentual inválido")
  return percentual
}
