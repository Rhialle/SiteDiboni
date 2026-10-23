import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarUsuarioTeste,
  limparUsuarios,
  ultimoLinkPorEmail,
  type DadosUsuarioTeste,
} from "./apoio/supabase"

const DONA: DadosUsuarioTeste = {
  email: "dona@loja.test",
  senha: "SenhaDona123",
  nome: "Dona",
  papel: "administrador",
}
const FUNC: DadosUsuarioTeste = {
  email: "func@loja.test",
  senha: "SenhaFunc123",
  nome: "Func",
  papel: "funcionario",
}
const ULTIMO_ADMINISTRADOR = "Precisa existir pelo menos um administrador ativo."
const DESATIVADO = "Este usuário está desativado. Fale com o administrador."

function linhaDe(page: Page, email: string) {
  return page.getByRole("row").filter({ hasText: email })
}

async function desativarFuncionaria(page: Page) {
  await page.goto("/usuarios")
  await linhaDe(page, FUNC.email).getByRole("button", { name: "Desativar" }).click()
  await expect(linhaDe(page, FUNC.email)).toContainText("Desativado")
}

test.beforeEach(async () => {
  await limparUsuarios()
  await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

test("administrador convida funcionária, que define a senha e entra sem ver Usuários", async ({
  page,
  browser,
}) => {
  await entrarComoAdministrador(page, DONA)
  await page.getByRole("link", { name: "Usuários" }).click()
  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible()

  await campo(page, "Nome").fill("Nova")
  await campo(page, "E-mail").fill("nova@loja.test")
  await page.getByRole("button", { name: "Convidar" }).click()
  await expect(page.getByText("Convite enviado para nova@loja.test.")).toBeVisible()
  await expect(linhaDe(page, "nova@loja.test")).toContainText("Funcionário")

  const contexto = await browser.newContext()
  const nova = await contexto.newPage()
  await nova.goto(await ultimoLinkPorEmail("nova@loja.test"))
  await campo(nova, "Nova senha").fill("SenhaNova123")
  await nova.getByRole("button", { name: "Salvar senha" }).click()
  await expect(nova.getByRole("heading", { name: "Início" })).toBeVisible()
  await expect(nova.getByText("Olá, Nova")).toBeVisible()
  await expect(nova.getByRole("link", { name: "Usuários" })).toHaveCount(0)
  await contexto.close()
})

test("convite com e-mail repetido (com maiúsculas) mostra a mensagem", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  await page.goto("/usuarios")
  await campo(page, "Nome").fill("Outra")
  await campo(page, "E-mail").fill("FUNC@Loja.test")
  await page.getByRole("button", { name: "Convidar" }).click()
  await expect(page.getByText("Já existe um usuário com este e-mail.")).toBeVisible()
})

test("único administrador não consegue se desativar nem se rebaixar", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)

  await page.goto("/usuarios")
  await linhaDe(page, DONA.email).getByRole("button", { name: "Desativar" }).click()
  await expect(page.getByText(ULTIMO_ADMINISTRADOR)).toBeVisible()

  await page.reload()
  await linhaDe(page, DONA.email).getByRole("button", { name: "Tornar funcionário" }).click()
  await expect(page.getByText(ULTIMO_ADMINISTRADOR)).toBeVisible()

  await page.reload()
  await expect(linhaDe(page, DONA.email)).toContainText("Administrador")
  await expect(linhaDe(page, DONA.email)).toContainText("Ativo")
})

test("funcionária desativada com a sessão aberta cai no /entrar", async ({ page, browser }) => {
  const contexto = await browser.newContext({ baseURL: "http://localhost:3000" })
  const func = await contexto.newPage()
  await entrar(func, FUNC.email, FUNC.senha)
  await expect(func.getByRole("heading", { name: "Início" })).toBeVisible()

  await entrarComoAdministrador(page, DONA)
  await desativarFuncionaria(page)

  await func.reload()
  await expect(func).toHaveURL(/\/entrar\?motivo=desativado/)
  await expect(func.getByText(DESATIVADO)).toBeVisible()
  await contexto.close()
})

test("funcionária desativada não consegue entrar de novo", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  await desativarFuncionaria(page)

  await page.getByRole("button", { name: "Sair" }).click()
  await expect(page).toHaveURL(/\/entrar/)
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByText(DESATIVADO)).toBeVisible()
})

test("funcionária que abre /usuarios vê a página sem permissão", async ({ page }) => {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.goto("/usuarios")
  await expect(page.getByText("Você não tem permissão para acessar esta página.")).toBeVisible()
})
