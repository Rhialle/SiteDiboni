import { expect, test, type Page } from "@playwright/test"
import { Secret, TOTP } from "otpauth"

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

// Com Cache Components a página anterior fica escondida no DOM: só interessa o campo visível.
function campo(page: Page, rotulo: string) {
  return page.getByLabel(rotulo, { exact: true }).filter({ visible: true })
}

async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/entrar")
  await campo(page, "E-mail").fill(email)
  await campo(page, "Senha").fill(senha)
  await page.getByRole("button", { name: "Entrar" }).click()
}

async function abrirLinkDeRecuperacao(page: Page, email: string) {
  await page.goto("/entrar")
  await page.getByRole("link", { name: "Esqueci minha senha" }).click()
  // Espera a tela nova aparecer: até lá, o campo "E-mail" visível ainda é o da tela anterior.
  await expect(
    page.getByText("Informe seu e-mail e enviaremos um link para criar uma nova senha."),
  ).toBeVisible()
  await campo(page, "E-mail").fill(email)
  await page.getByRole("button", { name: "Enviar link" }).click()
  await expect(
    page.getByText(
      "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.",
    ),
  ).toBeVisible()
  await page.goto(await ultimoLinkPorEmail(email))
}

test.beforeEach(async () => {
  await limparUsuarios()
  await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

test("sem sessão, /inicio leva para /entrar", async ({ page }) => {
  await page.goto("/inicio")
  await expect(page).toHaveURL(/\/entrar/)
})

test("senha errada mostra a mensagem", async ({ page }) => {
  await entrar(page, FUNC.email, "SenhaErrada123")
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible()
})

test("funcionária entra e vê o Início com o nome", async ({ page }) => {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await expect(page.getByText("Olá, Func")).toBeVisible()
})

test("administrador cadastra as duas etapas e entra", async ({ page }) => {
  await entrar(page, DONA.email, DONA.senha)
  await expect(page).toHaveURL(/\/entrar\/duas-etapas/)

  const segredo = (await page.getByTestId("segredo-duas-etapas").textContent())!.trim()
  await campo(page, "Código de 6 dígitos").fill(
    new TOTP({ secret: Secret.fromBase32(segredo) }).generate(),
  )
  await page.getByRole("button", { name: "Confirmar" }).click()

  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await expect(page.getByText("Olá, Dona")).toBeVisible()
})

test("código de duas etapas errado mostra a mensagem", async ({ page }) => {
  await entrar(page, DONA.email, DONA.senha)
  await expect(page.getByTestId("segredo-duas-etapas")).toBeVisible()
  await campo(page, "Código de 6 dígitos").fill("000000")
  await page.getByRole("button", { name: "Confirmar" }).click()
  await expect(
    page.getByText("Código incorreto. Confira o aplicativo e tente de novo."),
  ).toBeVisible()
})

test("recuperar senha: e-mail, link, nova senha, entrar", async ({ page }) => {
  await abrirLinkDeRecuperacao(page, FUNC.email)
  await campo(page, "Nova senha").fill("NovaSenha123")
  await page.getByRole("button", { name: "Salvar senha" }).click()
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()

  await page.getByRole("button", { name: "Sair" }).click()
  await entrar(page, FUNC.email, "NovaSenha123")
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
})

test("link inválido mostra a mensagem", async ({ page }) => {
  await page.goto("/auth/confirmar?token_hash=xxx&type=recovery&next=/redefinir-senha")
  await expect(
    page.getByText("Este link expirou ou já foi usado. Peça um novo ao administrador."),
  ).toBeVisible()
})

test("senha nova curta mostra a mensagem", async ({ page }) => {
  await abrirLinkDeRecuperacao(page, FUNC.email)
  await campo(page, "Nova senha").fill("curta")
  await page.getByRole("button", { name: "Salvar senha" }).click()
  await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres.")).toBeVisible()
})
