import { expect, test, type Page } from "@playwright/test"

import { criarInventarioTeste, itensDoInventario } from "./apoio/banco"
import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarCategoriaTeste,
  criarEstoqueTeste,
  criarFormaTeste,
  criarProdutoTeste,
  criarUsuarioTeste,
  dataDaqui,
  limparCatalogo,
  limparUsuarios,
  restaurarConfiguracoes,
  type DadosUsuarioTeste,
} from "./apoio/supabase"

const DONA: DadosUsuarioTeste = { email: "dona@loja.test", senha: "SenhaDona123", nome: "Dona", papel: "administrador" }
const FUNC: DadosUsuarioTeste = { email: "func@loja.test", senha: "SenhaFunc123", nome: "Func", papel: "funcionario" }

let donaId = ""

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  await restaurarConfiguracoes()
  donaId = await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

const textoNaTela = (page: Page, texto: string) => page.getByText(texto).filter({ visible: true })
const linha = (page: Page, texto: string) => page.getByRole("row").filter({ hasText: texto })

async function entrarComoFuncionaria(page: Page) {
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
}

// --- Lista e abertura (Task 4) ---

test("administrador abre inventário de uma categoria e vai para a contagem", async ({ page }) => {
  const confeitaria = await criarCategoriaTeste("Confeitaria")
  await criarProdutoTeste({ nome: "Forminha", categorias: [confeitaria] })
  await entrarComoAdministrador(page, DONA)
  await page.goto("/inventario")
  await expect(page.getByRole("heading", { name: "Inventário", level: 1 })).toBeVisible()
  await expect(textoNaTela(page, "Nenhum inventário.")).toBeVisible()

  await campo(page, "Descrição").fill("Prateleira 1")
  await page.getByRole("radio", { name: "Categorias" }).check()
  await page.getByRole("checkbox", { name: "Confeitaria" }).check()
  await page.getByRole("button", { name: "Abrir inventário" }).click()
  await expect(page).toHaveURL(/\/inventario\/\d+$/)

  await page.goto("/inventario")
  await expect(linha(page, "Prateleira 1")).toContainText("Em contagem")
  await expect(linha(page, "Prateleira 1")).toContainText("Categorias")
  await expect(linha(page, "Prateleira 1")).toContainText("Dona")
})

test("com um inventário em andamento, abrir outro mostra a mensagem", async ({ page }) => {
  await criarInventarioTeste("Prateleira 1", donaId)
  await entrarComoAdministrador(page, DONA)
  await page.goto("/inventario")
  await campo(page, "Descrição").fill("Prateleira 2")
  await page.getByRole("button", { name: "Abrir inventário" }).click()
  await expect(
    textoNaTela(page, "Já existe um inventário em andamento: termine ou cancele antes de abrir outro."),
  ).toBeVisible()
})

test("funcionária vê a lista e não vê a caixa de abrir", async ({ page }) => {
  await criarInventarioTeste("Prateleira 1", donaId)
  await entrarComoFuncionaria(page)
  await page.getByRole("link", { name: "Inventário" }).first().click()
  await expect(linha(page, "Prateleira 1")).toContainText("Em contagem")
  await expect(page.getByRole("button", { name: "Abrir inventário" })).toHaveCount(0)
})

// --- Contagem (Task 5) ---

const formulario = (page: Page, nome: string) => page.getByRole("form", { name: nome })
const diaNaTela = (dia: string) => dia.split("-").reverse().join("/")

async function abrirContagem(page: Page, inventarioId: number, busca: string) {
  await page.goto(`/inventario/${inventarioId}?q=${encodeURIComponent(busca)}`)
}

test("funcionária conta em formas de venda: 3 caixas + 4 pacotes fica Contado: 340 un", async ({ page }) => {
  const { variacaoId } = await criarProdutoTeste({ nome: "Forminha" })
  await criarFormaTeste(variacaoId, { nome: "Caixa com 100", fator: 100, preco_centavos: 1500 })
  await criarFormaTeste(variacaoId, { nome: "Pacote com 10", fator: 10, preco_centavos: 200 })
  const inventarioId = await criarInventarioTeste("Prateleira 1", donaId)
  await entrarComoFuncionaria(page)
  await abrirContagem(page, inventarioId, "forminha")

  const contagem = formulario(page, "Contagem de Forminha – Padrão")
  await contagem.getByLabel("Caixa com 100").fill("3")
  await contagem.getByLabel("Pacote com 10").fill("4")
  await contagem.getByRole("button", { name: "Salvar contagem" }).click()
  await expect(contagem).toContainText("Contado: 340 un")
})

test("contagem às cegas: a tela de contagem não mostra o saldo do sistema", async ({ page }) => {
  const { variacaoId } = await criarProdutoTeste({ nome: "Forminha" })
  await criarEstoqueTeste(variacaoId, { quantidade: 137, custo: 0.05, usuarioId: donaId })
  const inventarioId = await criarInventarioTeste("Prateleira 1", donaId)
  await entrarComoFuncionaria(page)
  await abrirContagem(page, inventarioId, "forminha")

  await expect(formulario(page, "Contagem de Forminha – Padrão")).toBeVisible()
  await expect(page.locator("main").filter({ visible: true })).not.toContainText("137")
})

test("lote que não está na lista: com a validade, o lote INV é criado e contado", async ({ page }) => {
  await criarProdutoTeste({ nome: "Granulado", tipo_venda: "peso", controla_validade: true })
  const inventarioId = await criarInventarioTeste("Prateleira 1", donaId)
  await entrarComoFuncionaria(page)
  await abrirContagem(page, inventarioId, "granulado")

  const novo = formulario(page, "Lote que não está na lista")
  await novo.getByLabel("kg").fill("1,5")
  await novo.getByRole("button", { name: "Salvar contagem" }).click()
  await expect(novo).toContainText("Informe a validade do lote.")

  await novo.getByLabel("Validade").fill(dataDaqui(90))
  await novo.getByLabel("kg").fill("1,5")
  await novo.getByRole("button", { name: "Salvar contagem" }).click()
  const lote = formulario(page, `Lote INV-${dataDaqui(0)}, vence em ${diaNaTela(dataDaqui(90))}`)
  await expect(lote).toContainText("Contado: 1.500 g")
})

test("contar de novo o mesmo item substitui a contagem", async ({ page }) => {
  await criarProdutoTeste({ nome: "Forminha" })
  const inventarioId = await criarInventarioTeste("Prateleira 1", donaId)
  await entrarComoFuncionaria(page)
  await abrirContagem(page, inventarioId, "forminha")

  const contagem = formulario(page, "Contagem de Forminha – Padrão")
  await contagem.getByLabel("unidade(s)").fill("5")
  await contagem.getByRole("button", { name: "Salvar contagem" }).click()
  await expect(contagem).toContainText("Contado: 5 un")
  await contagem.getByLabel("unidade(s)").fill("7")
  await contagem.getByRole("button", { name: "Salvar contagem" }).click()
  await expect(contagem).toContainText("Contado: 7 un")
  expect(await itensDoInventario(inventarioId)).toBe(1)
})
