// Grava o .env.local com o endereço e as chaves do Supabase que roda no Docker.
import { execSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const saida = execSync("npx supabase status -o json", {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
})
const status = JSON.parse(saida.slice(saida.indexOf("{")))

const url = status.API_URL
const publicavel = status.PUBLISHABLE_KEY ?? status.ANON_KEY
const secreta = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY

if (!url || !publicavel || !secreta) {
  console.error("O Supabase local não respondeu. Rode `npm run db:iniciar` antes.")
  process.exit(1)
}

writeFileSync(
  ".env.local",
  [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publicavel}`,
    `SUPABASE_SECRET_KEY=${secreta}`,
    "",
  ].join("\n"),
)
console.log("Arquivo .env.local gravado com as chaves do Supabase local.")
