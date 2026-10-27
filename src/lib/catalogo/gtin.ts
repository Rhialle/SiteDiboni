// Mesma regra da função gtin_valido do banco: 8, 12, 13 ou 14 dígitos e dígito verificador
// módulo 10, com pesos 3 e 1 alternados a partir da direita.
export function gtinValido(texto: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(texto)) return false

  const digitos = [...texto].map(Number)
  const verificador = digitos.pop()!
  const soma = digitos
    .reverse()
    .reduce((total, digito, i) => total + digito * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (soma % 10)) % 10 === verificador
}
