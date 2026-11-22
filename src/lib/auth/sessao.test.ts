import { beforeEach, describe, expect, it, vi } from "vitest"

const { cliente, eq, maybeSingle } = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const cliente = {
    auth: {
      getClaims: vi.fn(),
      getUser: vi.fn(),
      mfa: { getAuthenticatorAssuranceLevel: vi.fn() },
    },
    from: vi.fn(() => ({ select: () => ({ eq }) })),
  }
  return { cliente, eq, maybeSingle }
})

vi.mock("server-only", () => ({}))
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`redirecionou para ${destino}`)
  },
}))
vi.mock("@/lib/supabase/servidor", () => ({ criarClienteServidor: async () => cliente }))

import { exigirAdministrador, exigirUsuario, obterUsuarioSessao } from "./sessao"

const DONA = { id: "u1", nome: "Dona", email: "dona@loja.test", papel: "administrador" as const }

function comSessao(claims: Record<string, unknown> | null, error: { message: string } | null = null) {
  cliente.auth.getClaims.mockResolvedValue({ data: claims ? { claims } : null, error })
}

describe("sessão", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cliente.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    cliente.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1" } })
    maybeSingle.mockResolvedValue({ data: DONA })
  })

  it("confere a sessão sem perguntar ao servidor de login", async () => {
    comSessao({ sub: "u1", aal: "aal2" })

    expect(await obterUsuarioSessao()).toEqual({ ...DONA, nivel: "aal2" })
    expect(cliente.auth.getUser).not.toHaveBeenCalled()
    expect(cliente.auth.mfa.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith("id", "u1")
  })

  it("sessão sem duas etapas fica em aal1", async () => {
    comSessao({ sub: "u1", aal: "aal1" })
    expect((await obterUsuarioSessao())?.nivel).toBe("aal1")

    comSessao({ sub: "u1" })
    expect((await obterUsuarioSessao())?.nivel).toBe("aal1")
  })

  it("sem sessão vai para /entrar", async () => {
    comSessao(null)

    expect(await obterUsuarioSessao()).toBeNull()
    await expect(exigirUsuario()).rejects.toThrow("redirecionou para /entrar")
  })

  it("sessão inválida vai para /entrar", async () => {
    comSessao(null, { message: "invalid JWT" })

    await expect(exigirUsuario()).rejects.toThrow("redirecionou para /entrar")
  })

  it("quem não tem linha em usuarios está desativado", async () => {
    comSessao({ sub: "u1", aal: "aal1" })
    maybeSingle.mockResolvedValue({ data: null })

    await expect(exigirUsuario()).rejects.toThrow("redirecionou para /sair?motivo=desativado")
  })

  it("funcionária em tela de administrador vai para /sem-permissao", async () => {
    comSessao({ sub: "u2", aal: "aal1" })
    maybeSingle.mockResolvedValue({ data: { id: "u2", nome: "Func", email: "func@loja.test", papel: "funcionario" } })

    await expect(exigirAdministrador()).rejects.toThrow("redirecionou para /sem-permissao")
  })
})
