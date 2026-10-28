import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { custoDoItem, lerNotaXml, paraDadosDeImportacao, type NotaLida } from "./xml"

const modelo = (nome: string) => readFileSync(resolve("src/lib/notas/modelos", nome), "utf8")

function lida(texto: string): NotaLida {
  const resultado = lerNotaXml(texto)
  if (!resultado.ok) throw new Error(resultado.erro)
  return resultado.nota
}

describe("lerNotaXml", () => {
  it("lê a nota, o emitente e o destinatário", () => {
    expect(lida(modelo("nota-com-lote.xml"))).toMatchObject({
      chave: "17261011444777000161550010000004561000004565",
      emitente: { cnpj: "11444777000161", nome: "Embalagens Exemplo Ltda" },
      destinatarioCnpj: "11222333000181",
      numero: "456",
      serie: "1",
      emitidaEm: "2026-10-21T08:15:00-03:00",
    })
  })

  it("lê os itens com quantidades e valores como estão no XML", () => {
    const { itens } = lida(modelo("nota-com-lote.xml"))
    expect(itens).toHaveLength(3)
    expect(itens[0]).toEqual({
      numeroItem: 1,
      codigo: "A1",
      descricao: "FORMINHA N4 MARROM CX C/1000",
      codigoBarras: null,
      ncm: "48239099",
      unidade: "CX",
      quantidade: "2.5000",
      rastro: [],
      valores: {
        valorProduto: "100.00",
        desconto: "5.00",
        frete: "2.50",
        seguro: "0",
        outrasDespesas: "0.50",
        ipi: "1.00",
        icmsSt: "3.00",
      },
    })
  })

  it("lê os lotes do rastro; IPI não tributado e sem ICMS-ST valem zero", () => {
    const item = lida(modelo("nota-com-lote.xml")).itens[1]
    expect(item.rastro).toEqual([
      { codigo: "L1", quantidade: "1.500", validade: "2027-03-10" },
      { codigo: "L2", quantidade: "0.500", validade: "2027-05-22" },
    ])
    expect(item.valores).toMatchObject({ ipi: "0", icmsSt: "0" })
    expect(item.codigoBarras).toBe("7891000000021")
  })

  it("código de barras vazio ou SEM GTIN vira nulo", () => {
    expect(lida(modelo("nota-com-lote.xml")).itens[2].codigoBarras).toBeNull()
  })

  it("nota com um item só (det não é lista no XML)", () => {
    const nota = lida(modelo("nota-simples.xml"))
    expect(nota.emitente).toEqual({ cnpj: "04252011000110", nome: "Doces Exemplo Ltda" })
    expect(nota.itens).toHaveLength(1)
    expect(nota.itens[0]).toMatchObject({ codigo: "GM14", unidade: "DP", quantidade: "2.0000", rastro: [] })
    expect(nota.itens[0].valores).toMatchObject({ valorProduto: "90.00", ipi: "4.50" })
  })

  it("destinatário com CPF fica sem CNPJ (o banco recusa: não é para a loja)", () => {
    const comCpf = modelo("nota-simples.xml").replace("<dest><CNPJ>11222333000181</CNPJ>", "<dest><CPF>12345678909</CPF>")
    expect(lida(comCpf).destinatarioCnpj).toBe("")
  })

  it("recusa o que não é XML de NF-e", () => {
    const erro = { ok: false, erro: "Arquivo inválido: não é o XML de uma NF-e." }
    expect(lerNotaXml("<xml/>")).toEqual(erro)
    expect(lerNotaXml("isto não é um xml")).toEqual(erro)
    expect(lerNotaXml("")).toEqual(erro)
  })

  it("recusa nota sem autorização da SEFAZ", () => {
    const semProtocolo = modelo("nota-simples.xml").replace(/<protNFe[\s\S]*<\/protNFe>/, "")
    const erro = { ok: false, erro: "Nota sem autorização da SEFAZ." }
    expect(lerNotaXml(semProtocolo)).toEqual(erro)
    expect(lerNotaXml(modelo("nota-simples.xml").replace("<cStat>100</cStat>", "<cStat>110</cStat>"))).toEqual(erro)
    expect(lerNotaXml(modelo("nota-simples.xml").replace("<cStat>100</cStat>", "<cStat>150</cStat>")).ok).toBe(true)
  })

  it("recusa NFC-e (modelo 65)", () => {
    expect(lerNotaXml(modelo("nota-simples.xml").replace("<mod>55</mod>", "<mod>65</mod>"))).toEqual({
      ok: false,
      erro: "Só aceitamos NF-e modelo 55 (nota de compra).",
    })
  })
})

describe("custoDoItem", () => {
  it("vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vICMSST, em centavos inteiros", () => {
    expect(
      custoDoItem({
        valorProduto: "100.00",
        desconto: "5.00",
        frete: "2.50",
        seguro: "0",
        outrasDespesas: "0.50",
        ipi: "1.00",
        icmsSt: "3.00",
      }),
    ).toBe("102.00")
    expect(custoDoItem(lida(modelo("nota-simples.xml")).itens[0].valores)).toBe("94.50")
    expect(custoDoItem({ valorProduto: "0.10", desconto: "0", frete: "0.20", seguro: "0", outrasDespesas: "0", ipi: "0", icmsSt: "0" })).toBe(
      "0.30",
    )
  })
})

describe("paraDadosDeImportacao", () => {
  it("monta o formato que importar_nota recebe", () => {
    const dados = paraDadosDeImportacao(lida(modelo("nota-com-lote.xml")), "abc.xml")
    expect(dados).toMatchObject({
      chave: "17261011444777000161550010000004561000004565",
      emitente: { cnpj: "11444777000161", nome: "Embalagens Exemplo Ltda" },
      destinatario_cnpj: "11222333000181",
      numero: "456",
      serie: "1",
      emitida_em: "2026-10-21T08:15:00-03:00",
      caminho_xml: "abc.xml",
    })
    expect(dados.itens[0]).toEqual({
      numero_item: 1,
      codigo: "A1",
      descricao: "FORMINHA N4 MARROM CX C/1000",
      codigo_barras: null,
      ncm: "48239099",
      unidade: "CX",
      quantidade: "2.5000",
      rastro: [],
      valores: {
        valor_produto: "100.00",
        desconto: "5.00",
        frete: "2.50",
        seguro: "0",
        outras_despesas: "0.50",
        ipi: "1.00",
        icms_st: "3.00",
      },
    })
    expect(dados.itens[1].rastro).toEqual([
      { codigo: "L1", quantidade: "1.500", validade: "2027-03-10" },
      { codigo: "L2", quantidade: "0.500", validade: "2027-05-22" },
    ])
  })
})
