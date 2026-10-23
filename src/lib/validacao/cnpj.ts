// Mesma regra da função cnpj_valido do banco: 14 dígitos, não todos iguais, dígitos verificadores certos.
export function normalizarCnpj(texto: string): string {
  return texto.replace(/\D/g, "")
}

function digitoVerificador(digitos: number[], pesos: number[]): number {
  const soma = pesos.reduce((total, peso, i) => total + digitos[i] * peso, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cnpjValido(texto: string): boolean {
  const cnpj = normalizarCnpj(texto)
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false

  const digitos = [...cnpj].map(Number)
  const dv1 = digitoVerificador(digitos, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const dv2 = digitoVerificador(digitos, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return digitos[12] === dv1 && digitos[13] === dv2
}

export function formatarCnpj(cnpj: string): string {
  return normalizarCnpj(cnpj).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}
