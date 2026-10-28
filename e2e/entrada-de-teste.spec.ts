// No CI, os testes de tela rodam com ENTRADA_DE_TESTE=1 (como o site de teste com o modo ligado).
import { expect, test } from "@playwright/test"

import { campo } from "./apoio/navegador"
import { limparCatalogo, limparUsuarios } from "./apoio/supabase"

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
})

test("Administrador de teste entra sem senha, com o menu de administrador e o aviso do modo de teste", async ({ page }) => {
  await page.goto("/entrar")
  await page.getByRole("button", { name: "Administrador de teste" }).click()
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Usuários" })).toBeVisible()
  await expect(page.getByText("Modo de teste: a entrada sem senha está ligada.")).toBeVisible()

  // Na segunda vez, a mesma conta entra de novo (sem pedir as duas etapas).
  await page.getByRole("button", { name: "Sair" }).click()
  await page.getByRole("button", { name: "Administrador de teste" }).click()
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
})

test("o administrador de teste consegue gravar: cria uma categoria", async ({ page }) => {
  await page.goto("/entrar")
  await page.getByRole("button", { name: "Administrador de teste" }).click()
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.goto("/categorias")
  await campo(page, "Nova categoria").fill("Criada no modo de teste")
  await campo(page, "Dentro de").selectOption({ label: "Raiz" })
  await page.getByRole("button", { name: "Criar categoria" }).click()
  await expect(page.getByRole("listitem").filter({ hasText: "Criada no modo de teste" }).first()).toBeVisible()
})

test("Funcionária de teste entra sem senha e não vê Usuários", async ({ page }) => {
  await page.goto("/entrar")
  await page.getByRole("button", { name: "Funcionária de teste" }).click()
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await expect(page.getByText("Olá, Funcionária de teste")).toBeVisible()
  await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0)
})
