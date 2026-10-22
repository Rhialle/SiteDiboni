// Dias de antecedência dos alertas de validade, digitados como "30, 15, 7".
export function lerDiasDeAlerta(texto: string): number[] {
  const partes = texto
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean)
  if (partes.length === 0 || partes.some((parte) => !/^[1-9]\d*$/.test(parte))) {
    throw new Error("Dias inválidos")
  }
  return [...new Set(partes.map(Number))].sort((a, b) => b - a)
}

export function formatarDiasDeAlerta(dias: number[]): string {
  return dias.join(", ")
}
