"use client"

import { useActionState, useId, useState, useTransition } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { confirmarNota, descartarNota, salvarRecebimento, type EstadoLigacao } from "./acoes"

const INICIAL: EstadoLigacao = { erro: "", sucesso: "", valores: null }

export type LoteDoRecebimento = { codigo: string; validade: string; quantidade: string }

// O que chegou de um item ligado, na unidade da nota. Os campos são controlados: o que a pessoa
// digitou não some quando o React limpa o formulário depois da ação.
export function Recebimento({
  notaId,
  itemId,
  numero,
  unidade,
  recebido,
  controlaValidade,
  lotes,
}: {
  notaId: string
  itemId: string
  numero: number
  unidade: string
  recebido: string
  controlaValidade: boolean
  lotes: LoteDoRecebimento[]
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(salvarRecebimento.bind(null, notaId, itemId), INICIAL)
  const [quantidade, setQuantidade] = useState(recebido)
  const [linhas, setLinhas] = useState(lotes)

  const mudarLinha = (indice: number, campo: keyof LoteDoRecebimento, valor: string) =>
    setLinhas((atuais) => atuais.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)))

  return (
    <form action={acao} aria-label={`Recebimento do item ${numero}`} className="flex flex-col gap-3">
      <div className="flex max-w-xs flex-col gap-1">
        <Label htmlFor={`${id}-recebido`}>Recebido</Label>
        <div className="flex items-center gap-2">
          <Input
            id={`${id}-recebido`}
            name="recebido"
            inputMode="decimal"
            value={quantidade}
            onChange={(evento) => setQuantidade(evento.target.value)}
          />
          <span className="text-sm text-muted-foreground">{unidade}</span>
        </div>
      </div>

      {controlaValidade ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Lotes (quantidade em {unidade})</legend>
          {linhas.map((linha, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-lote-${i}-codigo`}>Lote {i + 1}: código</Label>
                <Input
                  id={`${id}-lote-${i}-codigo`}
                  name="lote_codigo"
                  placeholder="Opcional"
                  value={linha.codigo}
                  onChange={(evento) => mudarLinha(i, "codigo", evento.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-lote-${i}-validade`}>Lote {i + 1}: validade</Label>
                <Input
                  id={`${id}-lote-${i}-validade`}
                  name="lote_validade"
                  type="date"
                  value={linha.validade}
                  onChange={(evento) => mudarLinha(i, "validade", evento.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-lote-${i}-quantidade`}>Lote {i + 1}: quantidade</Label>
                <Input
                  id={`${id}-lote-${i}-quantidade`}
                  name="lote_quantidade"
                  inputMode="decimal"
                  value={linha.quantidade}
                  onChange={(evento) => mudarLinha(i, "quantidade", evento.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLinhas((atuais) => atuais.filter((_, j) => j !== i))}
              >
                Tirar o lote {i + 1}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => setLinhas((atuais) => [...atuais, { codigo: "", validade: "", quantidade: "" }])}
          >
            Acrescentar lote
          </Button>
        </fieldset>
      ) : null}

      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      <MensagemDeSucesso>{estado.sucesso}</MensagemDeSucesso>
      <Button type="submit" variant="outline" className="self-start" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar recebimento"}
      </Button>
    </form>
  )
}

// Confirmar (só em revisão) e descartar (enquanto aberta). Fica sempre na página, para a mensagem
// continuar à vista depois que a nota muda de situação.
export function AcoesDaNota({ notaId, emRevisao, aberta }: { notaId: string; emRevisao: boolean; aberta: boolean }) {
  const [resultado, setResultado] = useState({ erro: "", sucesso: "" })
  const [enviando, iniciar] = useTransition()

  function executar(acao: typeof confirmarNota, pergunta: string) {
    if (!window.confirm(pergunta)) return
    setResultado({ erro: "", sucesso: "" })
    iniciar(async () => {
      try {
        setResultado(await acao(notaId))
      } catch {
        setResultado({ erro: "Não foi possível concluir. Tente de novo.", sucesso: "" })
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {aberta ? (
        <div className="flex flex-wrap gap-2">
          {emRevisao ? (
            <Button
              type="button"
              disabled={enviando}
              onClick={() => executar(confirmarNota, "Confirmar a nota e dar entrada no estoque?")}
            >
              Confirmar nota
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={enviando}
            onClick={() => executar(descartarNota, "Descartar esta nota? Nada entra no estoque.")}
          >
            Descartar nota
          </Button>
        </div>
      ) : null}
      <MensagemDeErro>{resultado.erro}</MensagemDeErro>
      <MensagemDeSucesso>{resultado.sucesso}</MensagemDeSucesso>
    </div>
  )
}
