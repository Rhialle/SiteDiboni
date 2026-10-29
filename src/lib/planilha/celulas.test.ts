import { describe, expect, it } from "vitest"

import {
  lerCategorias,
  lerCodigoBarras,
  lerEstoqueMinimo,
  lerInteiroPositivo,
  lerMateriais,
  lerNcm,
  lerPreco,
  lerSimNao,
  lerTexto,
  lerTipoVenda,
  textoDaCelula,
} from "./celulas"

const ok = <T,>(valor: T) => ({ ok: true, valor })
const erro = (mensagem: string) => ({ ok: false, erro: mensagem })

describe("textoDaCelula", () => {
  it("lê fórmula, texto rico, link e número inteiro sem notação científica", () => {
    expect(textoDaCelula({ formula: "A1", result: 5 })).toBe("5")
    expect(textoDaCelula({ richText: [{ text: "Bo" }, { text: "los" }] })).toBe("Bolos")
    expect(textoDaCelula({ text: "site", hyperlink: "https://exemplo.test" })).toBe("site")
    expect(textoDaCelula(7891000000014)).toBe("7891000000014")
    expect(textoDaCelula("  Caixa  ")).toBe("Caixa")
    expect(textoDaCelula(null)).toBe("")
    expect(textoDaCelula(undefined)).toBe("")
  })
})

describe("lerNcm", () => {
  it("completa o zero que o Excel tira e aceita pontos", () => {
    expect(lerNcm(4021010)).toEqual(ok("04021010"))
    expect(lerNcm("4819.10.00")).toEqual(ok("48191000"))
    expect(lerNcm("")).toEqual(ok(null))
  })

  it("recusa o que não tem 8 dígitos", () => {
    expect(lerNcm("1234")).toEqual(erro("O NCM precisa ter 8 dígitos."))
  })
})

describe("lerCodigoBarras", () => {
  it("lê o número inteiro e confere o dígito", () => {
    expect(lerCodigoBarras(7891000000014)).toEqual(ok("7891000000014"))
    expect(lerCodigoBarras("")).toEqual(ok(null))
    expect(lerCodigoBarras("7891000000015")).toEqual(erro("Código de barras inválido."))
    expect(lerCodigoBarras("SEM GTIN")).toEqual(erro("Código de barras inválido."))
  })
})

describe("lerPreco", () => {
  it("aceita número do Excel e texto em reais, devolve centavos", () => {
    expect(lerPreco(12.5)).toEqual(ok(1250))
    expect(lerPreco("12,50")).toEqual(ok(1250))
    expect(lerPreco("R$ 12,50")).toEqual(ok(1250))
    expect(lerPreco("1.234,56")).toEqual(ok(123456))
    expect(lerPreco(0)).toEqual(ok(0))
  })

  it("recusa ponto decimal em texto, negativo, mais de 2 casas e vazio", () => {
    const precoInvalido = erro("Informe o preço em reais, por exemplo 6,00.")
    expect(lerPreco("12.50")).toEqual(precoInvalido)
    expect(lerPreco("-1")).toEqual(precoInvalido)
    expect(lerPreco(-1)).toEqual(precoInvalido)
    expect(lerPreco(12.345)).toEqual(precoInvalido)
    expect(lerPreco("")).toEqual(erro("Preencha este campo."))
  })
})

describe("lerSimNao", () => {
  it("S, Sim e verdadeiro valem sim; N, Não e vazio valem não", () => {
    for (const valor of ["s", "S", "Sim", "sim", true]) expect(lerSimNao(valor)).toEqual(ok(true))
    for (const valor of ["n", "N", "não", "Não", "nao", "", null, false]) expect(lerSimNao(valor)).toEqual(ok(false))
    expect(lerSimNao("talvez")).toEqual(erro("Use S ou N."))
  })
})

describe("lerTipoVenda", () => {
  it("unidade ou peso, sem diferença de maiúsculas; obrigatório", () => {
    expect(lerTipoVenda("Peso")).toEqual(ok("peso"))
    expect(lerTipoVenda("UNIDADE")).toEqual(ok("unidade"))
    expect(lerTipoVenda("")).toEqual(erro("Preencha este campo."))
    expect(lerTipoVenda("kg")).toEqual(erro("Use unidade ou peso."))
  })
})

describe("lerEstoqueMinimo", () => {
  it("vazio vale 0; inteiro zero ou mais, com ponto de milhar", () => {
    expect(lerEstoqueMinimo("")).toEqual(ok(0))
    expect(lerEstoqueMinimo(5)).toEqual(ok(5))
    expect(lerEstoqueMinimo("1.000")).toEqual(ok(1000))
    const invalido = erro("Use um número inteiro, zero ou mais.")
    expect(lerEstoqueMinimo(-1)).toEqual(invalido)
    expect(lerEstoqueMinimo("1,5")).toEqual(invalido)
    expect(lerEstoqueMinimo(1.5)).toEqual(invalido)
  })
})

describe("lerInteiroPositivo", () => {
  it("inteiro maior que zero; vazio é nulo ou obrigatório", () => {
    expect(lerInteiroPositivo(10, true)).toEqual(ok(10))
    expect(lerInteiroPositivo("", false)).toEqual(ok(null))
    expect(lerInteiroPositivo("", true)).toEqual(erro("Preencha este campo."))
    expect(lerInteiroPositivo(0, true)).toEqual(erro("Use um número inteiro maior que zero."))
    expect(lerInteiroPositivo("2,5", false)).toEqual(erro("Use um número inteiro maior que zero."))
  })
})

describe("lerCategorias", () => {
  it("normaliza os espaços em volta do >, ignora vazios e põe em ordem", () => {
    expect(lerCategorias("Bolos>Caixas; ;Festa")).toEqual(ok(["Bolos > Caixas", "Festa"]))
    expect(lerCategorias("Festa; Bolos  >  Caixas")).toEqual(ok(["Bolos > Caixas", "Festa"]))
    expect(lerCategorias("")).toEqual(ok([]))
  })

  it("recusa nível vazio e nome comprido demais", () => {
    expect(lerCategorias("Bolos >> Caixas")).toEqual(erro("Escreva as categorias assim: Bolos > Caixas para bolo; Festa."))
    expect(lerCategorias("x".repeat(81))).toEqual(erro("Use até 80 caracteres."))
  })
})

describe("lerMateriais", () => {
  it("separados por ;, em ordem e sem repetir", () => {
    expect(lerMateriais("Plástico; Papel; papel")).toEqual(ok(["Papel", "Plástico"]))
    expect(lerMateriais("")).toEqual(ok([]))
    expect(lerMateriais("x".repeat(61))).toEqual(erro("Use até 60 caracteres."))
  })
})

describe("lerTexto", () => {
  it("tira os espaços das pontas, confere obrigatório e tamanho", () => {
    expect(lerTexto("  Caixa  ", { obrigatorio: true, maximo: 160 })).toEqual(ok("Caixa"))
    expect(lerTexto("", { obrigatorio: false, maximo: 120 })).toEqual(ok(""))
    expect(lerTexto("", { obrigatorio: true, maximo: 160 })).toEqual(erro("Preencha este campo."))
    expect(lerTexto("x".repeat(161), { obrigatorio: true, maximo: 160 })).toEqual(erro("Use até 160 caracteres."))
  })
})
