"use client"

import { useActionState, useId } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatarQuantidade, type TipoVenda, type UnidadeDeDigitacao } from "@/lib/estoque/quantidade"

import { contarItem, type EstadoContagem } from "./acoes"

const INICIAL: EstadoContagem = { erro: "", sucesso: "", valores: null }

// Um formulário de contagem: um campo por unidade (unidade(s) e formas de venda, ou g e kg), somados.
// Sem lote (loteId nulo) num produto com validade, é o lote que não está na lista: pede validade e código.
// Nunca mostra o saldo do sistema: só o que esta contagem já registrou.
export function Contagem({
  inventarioId,
  variacaoId,
  loteId,
  titulo,
  unidades,
  tipoVenda,
  contado,
  loteNovo = false,
}: {
  inventarioId: number
  variacaoId: string
  loteId: string | null
  titulo: string
  unidades: UnidadeDeDigitacao[]
  tipoVenda: TipoVenda
  contado: number | null
  loteNovo?: boolean
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(contarItem.bind(null, inventarioId, variacaoId, loteId), INICIAL)
  const valor = (campo: string) => estado.valores?.[campo] ?? ""

  return (
    <form action={acao} aria-label={titulo} className="flex flex-col gap-3 rounded-2xl border bg-white/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{titulo}</h3>
        {contado !== null ? (
          <span className="text-sm font-medium">Contado: {formatarQuantidade(contado, tipoVenda)}</span>
        ) : null}
      </div>
      {loteNovo ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-validade`}>Validade</Label>
            <Input id={`${id}-validade`} name="validade" type="date" defaultValue={valor("validade")} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-codigo`}>Código do lote (opcional)</Label>
            <Input id={`${id}-codigo`} name="codigo" defaultValue={valor("codigo")} />
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {unidades.map((unidade) => (
          <div key={unidade.valor} className="flex flex-col gap-1">
            <Label htmlFor={`${id}-${unidade.valor}`}>{unidade.rotulo}</Label>
            <Input
              id={`${id}-${unidade.valor}`}
              name={`q:${unidade.valor}`}
              inputMode="decimal"
              className="h-11 text-lg"
              defaultValue={valor(`q:${unidade.valor}`)}
            />
          </div>
        ))}
      </div>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      <MensagemDeSucesso>{estado.sucesso}</MensagemDeSucesso>
      <Button type="submit" size="lg" className="self-start" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar contagem"}
      </Button>
    </form>
  )
}
