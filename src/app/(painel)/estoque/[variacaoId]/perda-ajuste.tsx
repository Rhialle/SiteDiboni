"use client"

import { useActionState, useId, useState } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { UnidadeDeDigitacao } from "@/lib/estoque/quantidade"

import { registrarPerdaOuAjuste, type EstadoEstoque } from "./acoes"

export type LoteParaPerda = { id: string; codigo: string; vencido: boolean }

const SELECT = "campo-escolha"
const INICIAL: EstadoEstoque = { erro: "", sucesso: "", valores: null }

// Perda ou ajuste, para todos. Os tipos seguem o lote: de lote vencido só sai perda por vencimento.
export function PerdaOuAjuste({
  variacaoId,
  unidades,
  lotes,
  controlaValidade,
  porPeso,
}: {
  variacaoId: string
  unidades: UnidadeDeDigitacao[]
  lotes: LoteParaPerda[]
  controlaValidade: boolean
  porPeso: boolean
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(registrarPerdaOuAjuste.bind(null, variacaoId), INICIAL)
  const [escolhido, setEscolhido] = useState(lotes[0]?.id ?? "")
  // Se o lote escolhido zerou e saiu da lista, vale o primeiro que sobrou.
  const loteId = lotes.some((lote) => lote.id === escolhido) ? escolhido : (lotes[0]?.id ?? "")
  const valor = (campo: string) => estado.valores?.[campo] ?? ""
  const vencido = lotes.find((lote) => lote.id === loteId)?.vencido ?? false

  const tipos = vencido
    ? [
        { valor: "perda_vencimento", rotulo: "Perda por vencimento" },
        { valor: "ajuste_entrou", rotulo: "Ajuste: entrou" },
      ]
    : [
        { valor: "perda_avaria", rotulo: "Perda por avaria" },
        ...(porPeso ? [{ valor: "quebra_pesagem", rotulo: "Quebra de pesagem" }] : []),
        { valor: "ajuste_entrou", rotulo: "Ajuste: entrou" },
        { valor: "ajuste_saiu", rotulo: "Ajuste: saiu" },
      ]

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3 vidro rounded-3xl p-5">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold">
        Perda ou ajuste
      </h2>
      {controlaValidade && lotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem lote com saldo para registrar perda ou ajuste.</p>
      ) : (
        <form action={acao} className="grid max-w-2xl gap-3 sm:grid-cols-2">
          {controlaValidade ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-lote`}>Lote</Label>
              <select id={`${id}-lote`} name="lote" value={loteId} onChange={(e) => setEscolhido(e.target.value)} className={SELECT}>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.vencido ? `${lote.codigo} (vencido)` : lote.codigo}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-tipo`}>Tipo</Label>
            {/* A key troca a lista quando o lote muda, para não ficar um tipo que não vale mais. */}
            <select key={loteId} id={`${id}-tipo`} name="tipo" defaultValue={valor("tipo") || tipos[0].valor} className={SELECT}>
              {tipos.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-quantidade`}>Quantidade</Label>
            <Input id={`${id}-quantidade`} name="quantidade" inputMode="decimal" defaultValue={valor("quantidade")} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-em`}>Em</Label>
            <select id={`${id}-em`} name="em" defaultValue={valor("em") || unidades[0]?.valor} className={SELECT}>
              {unidades.map((unidade) => (
                <option key={unidade.valor} value={unidade.valor}>
                  {unidade.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor={`${id}-motivo`}>Motivo</Label>
            <Input id={`${id}-motivo`} name="motivo" placeholder="Ex.: caixa amassada, contei de novo" defaultValue={valor("motivo")} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <MensagemDeErro>{estado.erro}</MensagemDeErro>
            {estado.sucesso ? (
              <MensagemDeSucesso>
                {estado.sucesso}
              </MensagemDeSucesso>
            ) : null}
            <Button type="submit" className="self-start" disabled={enviando}>
              {enviando ? "Registrando…" : "Registrar"}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
