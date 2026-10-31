import { paraUnidadeBase, type UnidadeDeDigitacao } from "@/lib/estoque/quantidade"
import { MENSAGENS, mensagemCampoDaContagem } from "@/lib/mensagens"

// A contagem digitada em várias unidades ("3 caixas + 4 pacotes", ou kg e g) somada na unidade base.
// Cada campo vem pelo valor da unidade (un, forma:<id>, g, kg). Zero explícito vale: é assim que se zera.
export function somarContagem(
  campos: Record<string, string>,
  unidades: UnidadeDeDigitacao[],
): { ok: true; total: number } | { ok: false; erro: string } {
  let total = 0
  let digitado = false
  for (const [valor, texto] of Object.entries(campos)) {
    const limpo = texto.trim()
    if (!limpo) continue
    const unidade = unidades.find((u) => u.valor === valor)
    if (!unidade) return { ok: false, erro: MENSAGENS.unidadeMudou }
    digitado = true
    if (/^0+(,0+)?$/.test(limpo)) continue
    const base = paraUnidadeBase(limpo, unidade.fator, unidade.casas)
    if (base === null) return { ok: false, erro: mensagemCampoDaContagem(unidade.rotulo) }
    total += base
  }
  return digitado ? { ok: true, total } : { ok: false, erro: MENSAGENS.contagemVazia }
}
