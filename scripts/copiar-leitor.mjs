// Copia o leitor de código de barras (WebAssembly) para public/leitor/, para o site servi-lo sem
// depender de outro endereço (fase 2.2). Roda depois de cada npm install/ci.
import { copyFileSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..")
const destino = join(raiz, "public", "leitor", "zxing_reader.wasm")

// Procura o zxing-wasm a partir do barcode-detector, para copiar a mesma versão que ele usa (mesmo
// que outro pacote traga outra versão do zxing-wasm).
let origem
try {
  const doLeitor = createRequire(join(raiz, "node_modules", "barcode-detector", "package.json"))
  origem = doLeitor.resolve("zxing-wasm/reader/zxing_reader.wasm")
} catch {
  console.error("Leitor de código de barras (zxing-wasm do barcode-detector) não encontrado. Rode npm install de novo.")
  process.exit(1)
}
mkdirSync(dirname(destino), { recursive: true })
copyFileSync(origem, destino)
console.log("Leitor de código de barras copiado para public/leitor/.")
