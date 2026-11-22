// Confere a restauração da cópia de segurança: para cada tabela do arquivo de dados, o número de
// linhas da cópia tem de ser igual ao count(*) no banco restaurado.
//
// Uso: node scripts/copia/conferir.mjs <dados.sql> <url-do-banco-restaurado>
// Escreve a tabela no resumo da execução do GitHub e sai com código 1 se houver diferença.

import { execFileSync } from "node:child_process"
import { appendFileSync, readFileSync } from "node:fs"

import { compararContagens, contarLinhasDoCopy } from "./contagem.mjs"

const [arquivo, url] = process.argv.slice(2)
if (!arquivo || !url) {
  console.error("Uso: node scripts/copia/conferir.mjs <dados.sql> <url-do-banco-restaurado>")
  process.exit(2)
}

const esperado = contarLinhasDoCopy(readFileSync(arquivo, "utf8"))
const obtido = {}
for (const tabela of Object.keys(esperado)) {
  const [esquema, nome] = tabela.split(".")
  try {
    const saida = execFileSync("psql", [url, "-At", "-c", `select count(*) from "${esquema}"."${nome}"`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    obtido[tabela] = Number(saida.trim())
  } catch {
    // Tabela que não existe no banco restaurado: fica de fora de "obtido" e vira diferença.
  }
}

const diferencas = compararContagens(esperado, obtido)
const linhas = Object.entries(esperado)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([tabela, n]) => `| ${tabela} | ${n} | ${obtido[tabela] ?? "—"} |`)
const resumo = [
  "### Conferência do banco restaurado",
  "",
  diferencas.length === 0
    ? `Todas as ${linhas.length} tabelas voltaram com o mesmo número de linhas.`
    : `**${diferencas.length} diferença(s):** ${diferencas.join("; ")}`,
  "",
  "| Tabela | Na cópia | Restaurado |",
  "|---|---|---|",
  ...linhas,
  "",
].join("\n")

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo)
console.log(resumo)
if (diferencas.length > 0) process.exit(1)
