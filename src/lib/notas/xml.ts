import { XMLParser, XMLValidator } from "fast-xml-parser"

// Leitura do XML da NF-e de compra (seção 9.1 da especificação). Números ficam como texto, do jeito
// que estão no XML; as contas de quantidade e custo ficam no banco (e o custo do item, aqui, em centavos).

export type ValoresDoItem = {
  valorProduto: string
  desconto: string
  frete: string
  seguro: string
  outrasDespesas: string
  ipi: string
  icmsSt: string
}

export type ItemLido = {
  numeroItem: number
  codigo: string
  descricao: string
  codigoBarras: string | null
  ncm: string | null
  unidade: string
  quantidade: string
  rastro: { codigo: string; quantidade: string; validade: string }[]
  valores: ValoresDoItem
}

export type NotaLida = {
  chave: string
  emitente: { cnpj: string; nome: string }
  destinatarioCnpj: string
  numero: string
  serie: string
  emitidaEm: string
  itens: ItemLido[]
}

const INVALIDO = "Arquivo inválido: não é o XML de uma NF-e."
const SEM_AUTORIZACAO = "Nota sem autorização da SEFAZ."
const MODELO = "Só aceitamos NF-e modelo 55 (nota de compra)."

const leitor = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: true,
  trimValues: true,
  isArray: (nome) => nome === "det" || nome === "rastro",
})

type No = Record<string, unknown>
const no = (valor: unknown): No => (valor !== null && typeof valor === "object" ? (valor as No) : {})
const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "")
const valor = (valorNoXml: unknown): string => texto(valorNoXml) || "0"

// O ICMS e o IPI vêm dentro de um grupo que muda conforme a tributação (ICMS00, ICMS10, IPITrib…).
function dentroDoGrupo(grupo: unknown, campo: string): string {
  for (const filho of Object.values(no(grupo))) {
    const encontrado = texto(no(filho)[campo])
    if (encontrado) return encontrado
  }
  return "0"
}

function lerItem(det: unknown): ItemLido {
  const prod = no(no(det).prod)
  const imposto = no(no(det).imposto)
  const codigoBarras = texto(prod.cEAN)
  const rastro = Array.isArray(prod.rastro) ? prod.rastro : []
  return {
    numeroItem: Number(texto(no(det)["@nItem"])),
    codigo: texto(prod.cProd),
    descricao: texto(prod.xProd),
    codigoBarras: codigoBarras && codigoBarras !== "SEM GTIN" ? codigoBarras : null,
    ncm: texto(prod.NCM) || null,
    unidade: texto(prod.uCom),
    quantidade: texto(prod.qCom),
    rastro: rastro.map((lote) => ({
      codigo: texto(no(lote).nLote),
      quantidade: texto(no(lote).qLote),
      validade: texto(no(lote).dVal),
    })),
    valores: {
      valorProduto: valor(prod.vProd),
      desconto: valor(prod.vDesc),
      frete: valor(prod.vFrete),
      seguro: valor(prod.vSeg),
      outrasDespesas: valor(prod.vOutro),
      ipi: dentroDoGrupo(imposto.IPI, "vIPI"),
      icmsSt: dentroDoGrupo(imposto.ICMS, "vICMSST"),
    },
  }
}

export function lerNotaXml(conteudo: string): { ok: true; nota: NotaLida } | { ok: false; erro: string } {
  if (!conteudo.trim() || XMLValidator.validate(conteudo) !== true) return { ok: false, erro: INVALIDO }
  const raiz = no(leitor.parse(conteudo))
  const nfe = no(no(raiz.nfeProc).NFe ?? raiz.NFe)
  const infNFe = no(nfe.infNFe)
  const ide = no(infNFe.ide)
  if (!texto(ide.mod) || !Array.isArray(infNFe.det)) return { ok: false, erro: INVALIDO }
  if (texto(ide.mod) !== "55") return { ok: false, erro: MODELO }

  // Autorizada: nfeProc com protocolo 100 (autorizada) ou 150 (autorizada fora de prazo).
  const protocolo = no(no(no(raiz.nfeProc).protNFe).infProt)
  if (!["100", "150"].includes(texto(protocolo.cStat))) return { ok: false, erro: SEM_AUTORIZACAO }

  const emit = no(infNFe.emit)
  return {
    ok: true,
    nota: {
      chave: texto(protocolo.chNFe) || texto(infNFe["@Id"]).replace(/^NFe/, ""),
      emitente: { cnpj: texto(emit.CNPJ), nome: texto(emit.xNome) },
      destinatarioCnpj: texto(no(infNFe.dest).CNPJ),
      numero: texto(ide.nNF),
      serie: texto(ide.serie),
      emitidaEm: texto(ide.dhEmi) || texto(ide.dEmi),
      itens: infNFe.det.map(lerItem),
    },
  }
}

const centavos = (valorEmReais: string) => Math.round(Number(valorEmReais) * 100)

// 9.1: custo do item = vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vICMSST.
export function custoDoItem(v: ValoresDoItem): string {
  const total =
    centavos(v.valorProduto) -
    centavos(v.desconto) +
    centavos(v.frete) +
    centavos(v.seguro) +
    centavos(v.outrasDespesas) +
    centavos(v.ipi) +
    centavos(v.icmsSt)
  return (total / 100).toFixed(2)
}

// O "dados" que a função importar_nota do banco recebe.
export function paraDadosDeImportacao(nota: NotaLida, caminhoXml: string) {
  return {
    chave: nota.chave,
    emitente: nota.emitente,
    destinatario_cnpj: nota.destinatarioCnpj,
    numero: nota.numero,
    serie: nota.serie,
    emitida_em: nota.emitidaEm,
    caminho_xml: caminhoXml,
    itens: nota.itens.map((item) => ({
      numero_item: item.numeroItem,
      codigo: item.codigo,
      descricao: item.descricao,
      codigo_barras: item.codigoBarras,
      ncm: item.ncm,
      unidade: item.unidade,
      quantidade: item.quantidade,
      rastro: item.rastro,
      valores: {
        valor_produto: item.valores.valorProduto,
        desconto: item.valores.desconto,
        frete: item.valores.frete,
        seguro: item.valores.seguro,
        outras_despesas: item.valores.outrasDespesas,
        ipi: item.valores.ipi,
        icms_st: item.valores.icmsSt,
      },
    })),
  }
}
