import { expect, test, type Page } from "@playwright/test"

import { campo, entrar, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarFormaTeste,
  criarProdutoTeste,
  criarUsuarioTeste,
  limparCatalogo,
  limparUsuarios,
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

async function abrirProdutoNovo(page: Page) {
  await entrarComoAdministrador(page, DONA)
  await page.goto("/produtos")
  await page.getByRole("link", { name: "Novo produto" }).click()
  await expect(page.getByRole("heading", { name: "Novo produto" })).toBeVisible()
}

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  await criarUsuarioTeste(DONA)
  await criarUsuarioTeste(FUNC)
})

test("administrador cria produto e cai na ficha com código interno e situação Incompleto", async ({ page }) => {
  await abrirProdutoNovo(page)
  await campo(page, "Nome").fill("Caixa para bolo")
  await page.getByRole("button", { name: "Criar produto" }).click()

  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { name: "Caixa para bolo" })).toBeVisible()
  await expect(page.getByText(/^P\d{6}$/)).toBeVisible()
  await expect(page.getByText("Incompleto", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Para ficar ativo falta: variação ativa com forma de venda, categoria, foto, NCM."),
  ).toBeVisible()
})

test("NCM com 7 dígitos mostra a mensagem", async ({ page }) => {
  await abrirProdutoNovo(page)
  await campo(page, "Nome").fill("Caixa para bolo")
  await campo(page, "NCM").fill("4819100")
  await page.getByRole("button", { name: "Criar produto" }).click()
  await expect(page.getByText("O NCM precisa ter 8 dígitos.")).toBeVisible()
})

test("código de barras inválido mostra a mensagem", async ({ page }) => {
  await abrirProdutoNovo(page)
  await campo(page, "Nome").fill("Caixa para bolo")
  await campo(page, "Código de barras").fill("4006381333932")
  await page.getByRole("button", { name: "Criar produto" }).click()
  await expect(page.getByText("Código de barras inválido.")).toBeVisible()
})

test("lista mostra situação e menor preço, e a busca acha pelo nome", async ({ page }) => {
  const caixa = await criarProdutoTeste({ nome: "Caixa para bolo" })
  await criarFormaTeste(caixa.variacaoId, { nome: "Pacote com 100", fator: 100, preco_centavos: 600 })
  await criarProdutoTeste({ nome: "Forminha nº 4" })

  await entrarComoAdministrador(page, DONA)
  await page.getByRole("link", { name: "Produtos" }).click()
  const linhaCaixa = page.getByRole("row").filter({ hasText: "Caixa para bolo" })
  await expect(linhaCaixa).toContainText("Incompleto")
  await expect(linhaCaixa).toContainText("R$ 6,00")
  await expect(page.getByRole("row").filter({ hasText: "Forminha nº 4" })).toBeVisible()

  await campo(page, "Buscar").fill("caixa")
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(page.getByRole("row").filter({ hasText: "Caixa para bolo" })).toBeVisible()
  await expect(page.getByRole("row").filter({ hasText: "Forminha nº 4" })).toHaveCount(0)
})

test("funcionária vê a lista sem o botão Novo produto", async ({ page }) => {
  await criarProdutoTeste({ nome: "Caixa para bolo" })
  await entrar(page, FUNC.email, FUNC.senha)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  await page.getByRole("link", { name: "Produtos" }).click()
  await expect(page.getByRole("row").filter({ hasText: "Caixa para bolo" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Novo produto" })).toHaveCount(0)
})

// --- Ficha do produto: variações, grade e formas de venda ---

async function abrirFicha(page: Page, produtoId: string, usuario: DadosUsuarioTeste = DONA) {
  if (usuario.papel === "administrador") await entrarComoAdministrador(page, usuario)
  else {
    await entrar(page, usuario.email, usuario.senha)
    await expect(page.getByRole("heading", { name: "Início" })).toBeVisible()
  }
  await page.goto(`/produtos/${produtoId}`)
}

function linhasDeVariacoes(page: Page) {
  return page.getByRole("table", { name: "Variações" }).locator("tbody tr")
}

test("grade Tamanho × Cor cria 6 variações e repetir não duplica", async ({ page }) => {
  const { produtoId } = await criarProdutoTeste({ nome: "Forminha" })
  await abrirFicha(page, produtoId)
  await campo(page, "Atributos da grade").fill("Tamanho: 4, 6, 12\nCor: marrom, branca")
  await page.getByRole("button", { name: "Gerar variações" }).click()
  await expect(page.getByText("6 variação(ões) criada(s).")).toBeVisible()
  await expect(linhasDeVariacoes(page)).toHaveCount(7)

  await page.getByRole("button", { name: "Gerar variações" }).click()
  await expect(page.getByText("Nenhuma variação nova: todas as combinações já existiam.")).toBeVisible()
  await expect(linhasDeVariacoes(page)).toHaveCount(7)
  await expect(linhasDeVariacoes(page).filter({ hasText: "12 branca" })).toHaveCount(1)
})

test("forma de venda com faixa mais barata; faixa fora de ordem é recusada", async ({ page }) => {
  const { produtoId } = await criarProdutoTeste({ nome: "Forminha" })
  await abrirFicha(page, produtoId)
  await campo(page, "Nome da forma").fill("Pacote com 100")
  await campo(page, "Quantidade na forma").fill("100")
  await campo(page, "Preço (R$)").fill("6,00")
  await page.getByRole("button", { name: "Adicionar forma" }).click()
  const forma = page.getByRole("group", { name: "Pacote com 100" })
  await expect(forma).toContainText("R$ 6,00")

  await campo(page, "A partir de").fill("10")
  await campo(page, "Preço da faixa (R$)").fill("5,40")
  await page.getByRole("button", { name: "Adicionar faixa" }).click()
  await expect(forma).toContainText("a partir de 10: R$ 5,40")

  await campo(page, "A partir de").fill("20")
  await campo(page, "Preço da faixa (R$)").fill("5,50")
  await page.getByRole("button", { name: "Adicionar faixa" }).click()
  await expect(
    page.getByText("O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior."),
  ).toBeVisible()
})

test("produto por peso usa preço por kg", async ({ page }) => {
  const { produtoId } = await criarProdutoTeste({ nome: "Granulado", tipo_venda: "peso" })
  await abrirFicha(page, produtoId)
  await expect(page.getByRole("button", { name: "Adicionar forma" })).toHaveCount(0)
  await campo(page, "Preço por kg (R$)").fill("32,00")
  await page.getByRole("button", { name: "Salvar preço por kg" }).click()
  await expect(page.getByText("Alterações salvas.")).toBeVisible()
  await page.reload()
  await expect(campo(page, "Preço por kg (R$)")).toHaveValue("32,00")
})

test("trocar para Por peso com forma Pacote com 100 é recusado", async ({ page }) => {
  const { produtoId, variacaoId } = await criarProdutoTeste({ nome: "Forminha" })
  await criarFormaTeste(variacaoId, { nome: "Pacote com 100", fator: 100, preco_centavos: 600 })
  await abrirFicha(page, produtoId)
  await campo(page, "Tipo de venda").selectOption("peso")
  await page.getByRole("button", { name: "Salvar dados" }).click()
  await expect(
    page.getByText("Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele."),
  ).toBeVisible()
})

test("código de barras repetido em outra variação mostra a mensagem", async ({ page }) => {
  await criarProdutoTeste({ nome: "Caixa", variacao: { codigo_barras: "4006381333931" } })
  const { produtoId } = await criarProdutoTeste({ nome: "Tampa" })
  await abrirFicha(page, produtoId)
  await campo(page, "Nome da variação").fill("Azul")
  await campo(page, "Código de barras").fill("4006381333931")
  await page.getByRole("button", { name: "Adicionar variação" }).click()
  await expect(page.getByText("Este código de barras já está em outra variação.")).toBeVisible()
})

test("funcionária abre a ficha e não vê nenhum botão de salvar ou gerar", async ({ page }) => {
  const { produtoId } = await criarProdutoTeste({ nome: "Forminha" })
  await abrirFicha(page, produtoId, FUNC)
  await expect(page.getByRole("heading", { name: "Forminha" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Salvar|Gerar|Adicionar/ })).toHaveCount(0)
})
