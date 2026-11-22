import { expect, test, type Page } from "@playwright/test"

import { caixaFechadoTeste, limparEstoque } from "./apoio/banco"
import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import { criarUsuarioTeste, limparUsuarios, type DadosUsuarioTeste } from "./apoio/supabase"

const DONA: DadosUsuarioTeste = { email: "dona@loja.test", senha: "SenhaDona123", nome: "Dona", papel: "administrador" }
const FUNC: DadosUsuarioTeste = { email: "func@loja.test", senha: "SenhaFunc123", nome: "Func", papel: "funcionario" }

let donaId = ""

test.beforeEach(async () => {
  await limparEstoque()
  await limparUsuarios()
  donaId = await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

const textoNaTela = (page: Page, texto: string) => page.getByText(texto).filter({ visible: true })

async function entrarComoFuncionaria(page: Page) {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
}

test("funcionária abre o caixa, registra retirada e reforço e fecha às cegas com diferença", async ({ page }) => {
  await entrarComoFuncionaria(page)
  await page.goto("/caixa")
  await expect(page.getByRole("heading", { name: "Abrir caixa" })).toBeVisible()
  await campo(page, "Troco inicial").fill("50,00")
  await page.getByRole("button", { name: "Abrir caixa" }).click()
  // Aberto o caixa, o formulário dá lugar ao caixa aberto.
  const aberto = page.getByRole("region", { name: "Caixa aberto" })
  await expect(aberto).toContainText("R$ 50,00")

  await campo(page, "Valor").fill("15,00")
  await campo(page, "Motivo").fill("entregador")
  await page.getByRole("button", { name: "Registrar" }).click()
  await expect(aberto).toContainText("Retirada de R$ 15,00 — entregador")
  await page.getByRole("radio", { name: "Reforço" }).check()
  await campo(page, "Valor").fill("20,00")
  await campo(page, "Motivo").fill("mais troco")
  await page.getByRole("button", { name: "Registrar" }).click()
  await expect(aberto).toContainText("Reforço de R$ 20,00 — mais troco")

  // Às cegas: nada do esperado antes de fechar.
  await expect(textoNaTela(page, "Esperado")).toHaveCount(0)
  await campo(page, "Dinheiro contado").fill("54,00")
  page.once("dialog", (dialogo) => dialogo.accept())
  await page.getByRole("button", { name: "Fechar caixa" }).click()
  await expect(page).toHaveURL(/\/caixa\/\d+$/)
  const dinheiro = page.getByRole("table", { name: "Fechamento" }).getByRole("row").filter({ hasText: "Dinheiro" })
  await expect(dinheiro).toContainText("R$ 55,00")
  await expect(dinheiro).toContainText("R$ 54,00")
  await expect(dinheiro).toContainText("R$ 1,00")
  await expect(page.getByRole("button", { name: "Marcar como conferido" })).toHaveCount(0)
})

test("administrador vê o caixa com diferença e marca como conferido", async ({ page }) => {
  const caixaId = await caixaFechadoTeste(donaId, { esperadoCentavos: 5500, contadoCentavos: 5400 })
  await entrarComoAdministrador(page, DONA)
  await page.goto("/caixa")
  const linha = page.getByRole("table", { name: "Caixas fechados" }).getByRole("row").nth(1)
  await expect(linha).toContainText("Com diferença")
  await page.goto(`/caixa/${caixaId}`)
  await page.getByRole("button", { name: "Marcar como conferido" }).click()
  // Conferido, o botão dá lugar ao aviso (a tela recarrega).
  await expect(textoNaTela(page, "Conferido pelo administrador.")).toBeVisible()
  await page.goto("/caixa")
  await expect(page.getByRole("table", { name: "Caixas fechados" }).getByRole("row").nth(1)).toContainText("Conferido")
})

test("funcionária vê só os caixas que ela fechou", async ({ page }) => {
  await caixaFechadoTeste(donaId, { esperadoCentavos: 5500, contadoCentavos: 5400 })
  await entrarComoFuncionaria(page)
  await page.goto("/caixa")
  await expect(textoNaTela(page, "Nenhum caixa fechado.")).toBeVisible()
})

test("o menu tem Balcão, Caixa e Vendas", async ({ page }) => {
  await entrarComoAdministrador(page, DONA)
  for (const nome of ["Balcão", "Caixa", "Vendas"]) {
    await expect(page.getByRole("link", { name: nome, exact: true }).first()).toBeVisible()
  }
})
