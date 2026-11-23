// Copia o leitor de código de barras (WebAssembly) para public/leitor/, para o site servi-lo sem
// depender de outro endereço (fase 2.2). Roda depois de cada npm install/ci.
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..")
const origem = join(raiz, "node_modules", "zxing-wasm", "dist", "reader", "zxing_reader.wasm")
const destino = join(raiz, "public", "leitor", "zxing_reader.wasm")

if (!existsSync(origem)) {
  console.error(`Leitor de código de barras não encontrado em ${origem}. Rode npm install de novo.`)
  process.exit(1)
}
mkdirSync(dirname(destino), { recursive: true })
copyFileSync(origem, destino)
console.log("Leitor de código de barras copiado para public/leitor/.")
