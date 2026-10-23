import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { atualizarSessao } from "./sessao-proxy"

describe("atualizarSessao", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("deixa a requisição seguir quando o Supabase ainda não foi configurado", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")

    const resposta = await atualizarSessao(new NextRequest("http://localhost:3000/entrar"))

    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("x-middleware-next")).toBe("1")
  })
})
