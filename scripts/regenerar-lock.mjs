// O npm no Windows às vezes deixa de fora do package-lock pacotes opcionais que o Linux
// (CI e Vercel) exige, e o `npm ci` de lá falha. Refazer o lock do zero resolve.
import { execSync } from "node:child_process"
import { rmSync } from "node:fs"

rmSync("node_modules", { recursive: true, force: true })
rmSync("package-lock.json", { force: true })
execSync("npm install", { stdio: "inherit" })
