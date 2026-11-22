// Contagem das linhas da cópia de segurança, para conferir a restauração.
//
// O arquivo de dados vem do `supabase db dump --data-only --use-copy`: cada tabela é um bloco
// `COPY "esquema"."tabela" (...) FROM stdin;`, uma linha por registro, terminado por `\.`.
// Quebras de linha dentro de um campo vêm escapadas (`\n`), então cada linha é um registro.

const INICIO = /^COPY\s+("?)([^".\s]+)\1\.("?)([^".\s]+)\3\s.*FROM stdin;$/

/** @returns {Record<string, number>} linhas por tabela, com a chave `esquema.tabela` */
export function contarLinhasDoCopy(sql) {
  const contagens = {}
  let atual = null
  for (const linha of sql.split(/\r?\n/)) {
    if (atual === null) {
      const inicio = INICIO.exec(linha)
      if (inicio) {
        atual = `${inicio[2]}.${inicio[4]}`
        contagens[atual] = 0
      }
    } else if (linha === "\\.") {
      atual = null
    } else {
      contagens[atual] += 1
    }
  }
  return contagens
}

/** @returns {string[]} uma frase por diferença; vazio quando a restauração bate com a cópia */
export function compararContagens(esperado, obtido) {
  return Object.entries(esperado).flatMap(([tabela, linhas]) => {
    if (!(tabela in obtido)) return [`${tabela}: não restaurada`]
    return obtido[tabela] === linhas ? [] : [`${tabela}: na cópia ${linhas}, restaurado ${obtido[tabela]}`]
  })
}
