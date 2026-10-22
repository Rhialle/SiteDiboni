// Ações de tela repetidas entre os testes.
import { expect, type Page } from "@playwright/test"
import { Secret, TOTP } from "otpauth"

import type { DadosUsuarioTeste } from "./supabase"

// Com Cache Components a página anterior fica escondida no DOM: só interessa o campo visível.
export function campo(page: Page, rotulo: string) {
  return page.getByLabel(rotulo, { exact: true }).filter({ visible: true })
}

export async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/entrar")
  await campo(page, "E-mail").fill(email)
  await campo(page, "Senha").fill(senha)
  await page.getByRole("button", { name: "Entrar" }).click()
}

// Primeiro acesso do administrador: cadastra as duas etapas e chega ao Início.
export async function entrarComoAdministrador(page: Page, usuario: DadosUsuarioTeste) {
  await entrar(page, usuario.email, usuario.senha)
  await expect(page).toHaveURL(/\/entrar\/duas-etapas/)
  const segredo = (await page.getByTestId("segredo-duas-etapas").textContent())!.trim()
  await campo(page, "Código de 6 dígitos").fill(
    new TOTP({ secret: Secret.fromBase32(segredo) }).generate(),
  )
  await page.getByRole("button", { name: "Confirmar" }).click()
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
}
