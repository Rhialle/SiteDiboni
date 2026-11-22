// Mesma regra da função cnpj_valido do banco. Desde julho de 2026 o CNPJ pode ser alfanumérico
// (IN RFB 2.229/2024): as 12 primeiras posições aceitam letras maiúsculas A–Z e números, e os
// 2 dígitos verificadores continuam numéricos. Cada caractere vale o código ASCII − 48 ('0'–'9'
// valem 0–9, 'A' vale 17, 'Z' vale 42) e o cálculo é o módulo 11 de sempre. Os CNPJs só com
// números continuam valendo, com os mesmos dígitos verificadores.

// Tira a pontuação (e qualquer outro sinal) e põe as letras em maiúsculas.
export function normalizarCnpj(texto: string): string {
  return texto.toUpperCase().replace(/[^0-9A-Z]/g, "")
}

function valor(caractere: string): number {
  return caractere.charCodeAt(0) - 48
}

function digitoVerificador(caracteres: string, pesos: number[]): number {
  const soma = pesos.reduce((total, peso, i) => total + valor(caracteres[i]) * peso, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cnpjValido(texto: string): boolean {
  const cnpj = normalizarCnpj(texto)
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false

  const dv1 = digitoVerificador(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const dv2 = digitoVerificador(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return cnpj.endsWith(`${dv1}${dv2}`)
}

export function formatarCnpj(cnpj: string): string {
  return normalizarCnpj(cnpj).replace(
    /^([0-9A-Z]{2})([0-9A-Z]{3})([0-9A-Z]{3})([0-9A-Z]{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  )
}
