import { expect, test, type Page } from "@playwright/test"

import { campo, entrarComoAdministrador } from "./apoio/navegador"
import {
  criarCategoriaTeste,
  criarFaixaTeste,
  criarFormaTeste,
  criarProdutosEmLote,
  criarProdutoTeste,
  criarUsuarioTeste,
  limparCatalogo,
  limparUsuarios,
  nomesDosProdutosInativos,
  type DadosUsuarioTeste,
} from "./apoio/supabase"

const DONA: DadosUsuarioTeste = {
  email: "dona@loja.test",
  senha: "SenhaDona123",
  nome: "Dona",
  papel: "administrador",
}

const linha = (page: Page, nome: string) => page.getByRole("row").filter({ hasText: nome })

async function abrirProdutos(page: Page) {
  await entrarComoAdministrador(page, DONA)
  await page.getByRole("link", { name: "Produtos" }).click()
  await expect(page.getByRole("heading", { name: "Produtos", level: 1 })).toBeVisible()
}

async function selecionar(page: Page, ...nomes: string[]) {
  for (const nome of nomes) await page.getByRole("checkbox", { name: `Selecionar ${nome}` }).check()
}

test.beforeEach(async () => {
  await limparUsuarios()
  await limparCatalogo()
  await criarUsuarioTeste(DONA)
})

test("busca sem acento e por código de barras; filtro por categoria inclui subcategorias", async ({ page }) => {
  const bolos = await criarCategoriaTeste("Bolos")
  const caixas = await criarCategoriaTeste("Caixas", bolos)
  await criarProdutoTeste({ nome: "Caixa para bolo", categorias: [caixas], variacao: { codigo_barras: "4006381333931" } })
  await criarProdutoTeste({ nome: "Embalagem para pão" })
  await abrirProdutos(page)

  await campo(page, "Buscar").fill("pao")
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(linha(page, "Embalagem para pão")).toBeVisible()
  await expect(linha(page, "Caixa para bolo")).toHaveCount(0)

  await campo(page, "Buscar").fill("4006381333931")
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(linha(page, "Caixa para bolo")).toBeVisible()
  await expect(linha(page, "Embalagem para pão")).toHaveCount(0)

  await campo(page, "Buscar").fill("")
  await campo(page, "Categoria").selectOption({ label: "Bolos" })
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(linha(page, "Caixa para bolo")).toBeVisible()
  await expect(linha(page, "Embalagem para pão")).toHaveCount(0)
})

test("reajuste de 10% em 2 produtos muda formas e faixas", async ({ page }) => {
  const caixa = await criarProdutoTeste({ nome: "Caixa para bolo" })
  const pacote = await criarFormaTeste(caixa.variacaoId, { nome: "Pacote com 100", fator: 100, preco_centavos: 600 })
  await criarFaixaTeste(pacote, 10, 540)
  const forminha = await criarProdutoTeste({ nome: "Forminha" })
  await criarFormaTeste(forminha.variacaoId, { nome: "Unidade", fator: 1, preco_centavos: 105 })
  await abrirProdutos(page)

  await selecionar(page, "Caixa para bolo", "Forminha")
  await campo(page, "Reajuste (%)").fill("10")
  await page.getByRole("button", { name: "Aplicar reajuste" }).click()
  await expect(page.getByText("Reajuste aplicado em 2 produto(s).")).toBeVisible()
  await expect(linha(page, "Caixa para bolo")).toContainText("R$ 6,60")
  await expect(linha(page, "Forminha")).toContainText("R$ 1,16")

  await page.goto(`/produtos/${caixa.produtoId}`)
  await expect(page.getByRole("group", { name: "Pacote com 100" })).toContainText("a partir de 10: R$ 5,94")
})

test("reajuste de -50% que empataria faixas mostra a mensagem e não muda nenhum preço", async ({ page }) => {
  const tampa = await criarProdutoTeste({ nome: "Tampa" })
  const unidade = await criarFormaTeste(tampa.variacaoId, { nome: "Unidade", fator: 1, preco_centavos: 300 })
  await criarFaixaTeste(unidade, 10, 100)
  await criarFaixaTeste(unidade, 20, 99)
  await abrirProdutos(page)

  await selecionar(page, "Tampa")
  await campo(page, "Reajuste (%)").fill("-50")
  await page.getByRole("button", { name: "Aplicar reajuste" }).click()
  await expect(
    page.getByText("O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior."),
  ).toBeVisible()
  await page.reload()
  await expect(linha(page, "Tampa")).toContainText("R$ 3,00")
})

test("sem selecionar nada, a barra mostra a mensagem", async ({ page }) => {
  await criarProdutoTeste({ nome: "Tampa" })
  await abrirProdutos(page)
  await campo(page, "Reajuste (%)").fill("10")
  await page.getByRole("button", { name: "Aplicar reajuste" }).click()
  await expect(page.getByText("Selecione pelo menos um produto.")).toBeVisible()
})

test("a seleção vale só para a página e a busca que estão na tela", async ({ page }) => {
  // 100 produtos: as duas páginas têm 50 linhas.
  await criarProdutosEmLote(Array.from({ length: 100 }, (_, i) => `Produto ${String(i + 1).padStart(3, "0")}`))
  await abrirProdutos(page)
  // Texto exato: "0 selecionado(s)" também é um pedaço de "50 selecionado(s)".
  const selecionados = (quantos: number) =>
    page.getByText(`${quantos} selecionado(s)`, { exact: true }).filter({ visible: true })
  const todos = page.getByRole("checkbox", { name: "Selecionar todos" })

  await todos.check()
  await expect(selecionados(50)).toBeVisible()

  await page.getByRole("link", { name: "Próxima" }).click()
  await expect(page.getByRole("navigation", { name: "Páginas" })).toContainText("Página 2 de 2")
  await expect(linha(page, "Produto 051")).toBeVisible()
  await expect(selecionados(0)).toBeVisible()
  await expect(todos).not.toBeChecked()
  await page.getByRole("button", { name: "Inativar", exact: true }).click()
  await expect(page.getByText("Selecione pelo menos um produto.")).toBeVisible()
  expect(await nomesDosProdutosInativos()).toEqual([])

  await selecionar(page, "Produto 051")
  await page.getByRole("button", { name: "Inativar", exact: true }).click()
  await expect(linha(page, "Produto 051")).toContainText("Inativo")
  expect(await nomesDosProdutosInativos()).toEqual(["Produto 051"])

  // Uma busca nova começa com nada marcado, mesmo que o produto marcado continue na lista.
  await selecionar(page, "Produto 052")
  await expect(selecionados(1)).toBeVisible()
  await campo(page, "Buscar").fill("Produto 05")
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(linha(page, "Produto 059")).toBeVisible()
  await expect(linha(page, "Produto 060")).toHaveCount(0)
  await expect(selecionados(0)).toBeVisible()
  await expect(page.getByRole("checkbox", { name: "Selecionar Produto 052" })).not.toBeChecked()
})

test("incluir categoria e inativar em massa aparecem nos filtros", async ({ page }) => {
  await criarCategoriaTeste("Doces")
  await criarProdutoTeste({ nome: "Caixa para bolo" })
  await criarProdutoTeste({ nome: "Forminha" })
  await abrirProdutos(page)

  await selecionar(page, "Caixa para bolo", "Forminha")
  await campo(page, "Categoria para aplicar").selectOption({ label: "Doces" })
  await page.getByRole("button", { name: "Incluir categoria" }).click()
  await expect(page.getByText("Alterações salvas.")).toBeVisible()

  await selecionar(page, "Caixa para bolo")
  await page.getByRole("button", { name: "Inativar", exact: true }).click()
  await expect(linha(page, "Caixa para bolo")).toContainText("Inativo")

  await campo(page, "Categoria").selectOption({ label: "Doces" })
  await campo(page, "Situação").selectOption({ label: "Inativo" })
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(linha(page, "Caixa para bolo")).toBeVisible()
  await expect(linha(page, "Forminha")).toHaveCount(0)
})
