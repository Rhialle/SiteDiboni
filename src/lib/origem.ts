import "server-only"

import { headers } from "next/headers"

// Endereço do site que recebeu a requisição (localhost, pré-visualização ou produção),
// usado nos links dos e-mails.
export async function origemDaRequisicao(): Promise<string> {
  const cabecalhos = await headers()
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "localhost:3000"
  const protocolo =
    cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${protocolo}://${host}`
}
