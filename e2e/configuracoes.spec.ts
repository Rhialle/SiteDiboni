import { expect, test } from "@playwright/test"

import { campo, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarUsuarioTeste,
  lerConfiguracoes,
  limparUsuarios,
  restaurarConfiguracoes,
  type DadosUsuarioTeste,
} from "./apoio/supabase"

const DONA: DadosUsuarioTeste = {
  email: "dona@loja.test",
  senha: "SenhaDona123",
  nome: "Dona",
  papel: "administrador",
}

test.beforeEach(async ({ page }) => {
  await limparUsuarios()
  await restaurarConfiguracoes()
  await criarUsuarioTeste(DONA)
  await entrarComoAdministrador(page, DONA)
  await page.getByRole("link", { name: "Configurações" }).click()
  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible()
})

test("CNPJ com máscara é salvo e reaparece formatado", async ({ page }) => {
  await campo(page, "CNPJ da loja").fill("11.222.333/0001-81")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Configurações salvas.")).toBeVisible()

  await page.reload()
  await expect(campo(page, "CNPJ da loja")).toHaveValue("11.222.333/0001-81")
  expect((await lerConfiguracoes()).cnpj_loja).toBe("11222333000181")
})

test("CNPJ inválido mostra a mensagem e não salva", async ({ page }) => {
  await campo(page, "CNPJ da loja").fill("11.222.333/0001-82")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("CNPJ inválido.")).toBeVisible()

  await page.reload()
  await expect(campo(page, "CNPJ da loja")).toHaveValue("")
  expect((await lerConfiguracoes()).cnpj_loja).toBeNull()
})

test("limite de ajuste em reais é salvo em centavos", async ({ page }) => {
  await campo(page, "Limite de ajuste (R$)").fill("80,00")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Configurações salvas.")).toBeVisible()

  await page.reload()
  await expect(page.getByText("R$ 80,00")).toBeVisible()
  expect((await lerConfiguracoes()).limite_ajuste_centavos).toBe(8000)
})
