import { gtinValido } from "@/lib/catalogo/gtin"
import { MENSAGENS, mensagemTamanhoMaximo } from "@/lib/mensagens"

// Cada célula da planilha vira um valor ou um erro. O Excel guarda número como número (o preço
// 12,50 chega como 12.5) e às vezes estraga o que parece número (o NCM perde o zero da frente).

export type Lido<T> = { ok: true; valor: T } | { ok: false; erro: string }

const ok = <T>(valor: T): Lido<T> => ({ ok: true, valor })
const erro = (mensagem: string): Lido<never> => ({ ok: false, erro: mensagem })

const INTEIRO = /^(\d{1,3}(?:\.\d{3})+|\d+)$/
const REAIS = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/

// Ordem alfabética sem diferença de maiúsculas e acentos, a mesma na leitura e na comparação.
export function emOrdem(lista: string[]): string[] {
  return [...lista].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
}

// Fórmula vale o resultado; texto rico e link valem o texto; número inteiro sem notação científica.
export function textoDaCelula(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  if (typeof valor === "number") return Number.isInteger(valor) ? valor.toFixed(0) : String(valor)
  if (typeof valor === "boolean") return valor ? "S" : "N"
  if (valor instanceof Date) return valor.toISOString().slice(0, 10)
  if (typeof valor === "object") {
    const celula = valor as { result?: unknown; richText?: { text: string }[]; text?: unknown }
    if ("result" in celula) return textoDaCelula(celula.result)
    if (Array.isArray(celula.richText)) return celula.richText.map((parte) => parte.text).join("").trim()
    if ("text" in celula) return textoDaCelula(celula.text)
    return ""
  }
  return String(valor).trim()
}

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

export function lerTexto(valor: unknown, regras: { obrigatorio: boolean; maximo: number }): Lido<string> {
  const texto = textoDaCelula(valor)
  if (!texto) return regras.obrigatorio ? erro(MENSAGENS.preenchaCampo) : ok("")
  if (texto.length > regras.maximo) return erro(mensagemTamanhoMaximo(regras.maximo))
  return ok(texto)
}

// Em célula de número o zero da frente some (04021010 vira 4021010): o NCM tem sempre 8 dígitos.
export function lerNcm(valor: unknown): Lido<string | null> {
  const texto = typeof valor === "number" && Number.isInteger(valor) ? valor.toFixed(0).padStart(8, "0") : textoDaCelula(valor)
  if (!texto) return ok(null)
  const digitos = texto.replace(/[.\s]/g, "")
  return /^\d{8}$/.test(digitos) ? ok(digitos) : erro(MENSAGENS.ncmInvalido)
}

export function lerCodigoBarras(valor: unknown): Lido<string | null> {
  const texto = textoDaCelula(valor)
  if (!texto) return ok(null)
  return /^\d+$/.test(texto) && gtinValido(texto) ? ok(texto) : erro(MENSAGENS.codigoBarrasInvalido)
}

// Preço em centavos. Texto só no jeito brasileiro: "12.50" é recusado, porque o ponto pode ser milhar.
export function lerPreco(valor: unknown): Lido<number> {
  if (typeof valor === "number") {
    const centavos = valor * 100
    const inteiros = Math.round(centavos)
    return valor >= 0 && Math.abs(centavos - inteiros) < 1e-6 ? ok(inteiros) : erro(MENSAGENS.precoInvalido)
  }
  const texto = textoDaCelula(valor).replace(/R\$/g, "").replace(/\s/g, "")
  if (!texto) return erro(MENSAGENS.preenchaCampo)
  const partes = REAIS.exec(texto)
  if (!partes) return erro(MENSAGENS.precoInvalido)
  return ok(Number(partes[1].replace(/\./g, "")) * 100 + Number((partes[2] ?? "").padEnd(2, "0")))
}

export function lerSimNao(valor: unknown): Lido<boolean> {
  const texto = semAcento(textoDaCelula(valor))
  if (texto === "s" || texto === "sim") return ok(true)
  if (texto === "" || texto === "n" || texto === "nao") return ok(false)
  return erro(MENSAGENS.simOuNao)
}

export function lerTipoVenda(valor: unknown): Lido<"unidade" | "peso"> {
  const texto = semAcento(textoDaCelula(valor))
  if (!texto) return erro(MENSAGENS.preenchaCampo)
  return texto === "unidade" || texto === "peso" ? ok(texto) : erro(MENSAGENS.unidadeOuPeso)
}

function inteiroDaCelula(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isInteger(valor) ? valor : null
  const texto = textoDaCelula(valor)
  return INTEIRO.test(texto) ? Number(texto.replace(/\./g, "")) : null
}

// Na unidade base (un ou g); vazio vale 0.
export function lerEstoqueMinimo(valor: unknown): Lido<number> {
  if (textoDaCelula(valor) === "") return ok(0)
  const numero = inteiroDaCelula(valor)
  return numero !== null && numero >= 0 ? ok(numero) : erro(MENSAGENS.inteiroZeroOuMais)
}

export function lerInteiroPositivo(valor: unknown, obrigatorio: boolean): Lido<number | null> {
  if (textoDaCelula(valor) === "") return obrigatorio ? erro(MENSAGENS.preenchaCampo) : ok(null)
  const numero = inteiroDaCelula(valor)
  return numero !== null && numero > 0 ? ok(numero) : erro(MENSAGENS.inteiroPositivo)
}

// Itens separados por ";", sem os vazios.
function lista(valor: unknown): string[] {
  return textoDaCelula(valor)
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
}

// Sem repetidos (sem diferença de maiúsculas e acentos; fica a primeira grafia), em ordem.
function semRepetidos(itens: string[]): string[] {
  const vistos = new Set<string>()
  return emOrdem(itens.filter((item) => !vistos.has(semAcento(item)) && Boolean(vistos.add(semAcento(item)))))
}

// "Bolos>Caixas; Festa" → ["Bolos > Caixas", "Festa"]: cada nível com até 80 caracteres.
export function lerCategorias(valor: unknown): Lido<string[]> {
  const caminhos: string[] = []
  for (const caminho of lista(valor)) {
    const niveis = caminho.split(">").map((nivel) => nivel.trim())
    if (niveis.some((nivel) => !nivel)) return erro(MENSAGENS.categoriasPlanilha)
    if (niveis.some((nivel) => nivel.length > 80)) return erro(mensagemTamanhoMaximo(80))
    caminhos.push(niveis.join(" > "))
  }
  return ok(semRepetidos(caminhos))
}

export function lerMateriais(valor: unknown): Lido<string[]> {
  const materiais = lista(valor)
  return materiais.some((material) => material.length > 60) ? erro(mensagemTamanhoMaximo(60)) : ok(semRepetidos(materiais))
}
