// Grade de variações: atributos com seus valores, digitados como "Tamanho: 4, 6, 12" (uma linha cada).
export type Grade = Record<string, string[]>

export function lerGrade(texto: string): Grade {
  const grade: Grade = {}
  const linhas = texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
  if (linhas.length === 0) throw new Error("Grade inválida")

  for (const linha of linhas) {
    const separador = linha.indexOf(":")
    const atributo = separador > 0 ? linha.slice(0, separador).trim() : ""
    const valores = [
      ...new Set(
        linha
          .slice(separador + 1)
          .split(",")
          .map((valor) => valor.trim())
          .filter(Boolean),
      ),
    ]
    if (!atributo || valores.length === 0) throw new Error("Grade inválida")
    grade[atributo] = valores
  }
  return grade
}

export function combinacoesDaGrade(
  grade: Grade,
): { nome: string; atributos: Record<string, string> }[] {
  let combinacoes: Record<string, string>[] = [{}]
  for (const [atributo, valores] of Object.entries(grade)) {
    combinacoes = combinacoes.flatMap((parcial) =>
      valores.map((valor) => ({ ...parcial, [atributo]: valor })),
    )
  }
  return combinacoes.map((atributos) => ({ nome: Object.values(atributos).join(" "), atributos }))
}

function mesmosAtributos(a: Record<string, string>, b: Record<string, string>): boolean {
  const chaves = Object.keys(a)
  return chaves.length === Object.keys(b).length && chaves.every((chave) => a[chave] === b[chave])
}

// As combinações da grade que ainda não existem entre as variações do produto.
export function novasCombinacoes(
  grade: Grade,
  existentes: Record<string, string>[],
): { nome: string; atributos: Record<string, string> }[] {
  return combinacoesDaGrade(grade).filter(
    (combinacao) => !existentes.some((existente) => mesmosAtributos(combinacao.atributos, existente)),
  )
}
