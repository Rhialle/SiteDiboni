"use client"

import { useActionState, useId, useState, useTransition } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { cancelarVenda, conferirVendaSemSaldo, type EstadoVenda } from "./acoes"

const INICIAL: EstadoVenda = { erro: "", sucesso: "" }

export function CancelarVenda({ vendaId, numero }: { vendaId: number; numero: number }) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(cancelarVenda.bind(null, vendaId, numero), INICIAL)
  return (
    <form action={acao} className="vidro flex max-w-xl flex-wrap items-end gap-3 rounded-3xl p-4 text-sm">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-motivo`}>Motivo do cancelamento</Label>
        <Input id={`${id}-motivo`} name="motivo" required maxLength={120} className="w-72" />
      </div>
      <Button
        type="submit"
        variant="outline"
        disabled={enviando}
        onClick={(evento) => {
          if (
            !window.confirm(
              `Cancelar a venda nº ${numero}? O estoque volta. Com o caixa dela aberto, ela sai do esperado; com o caixa já fechado, o fechamento guardado não muda e a venda fica marcada nele.`,
            )
          )
            evento.preventDefault()
        }}
      >
        Cancelar venda
      </Button>
      <div className="w-full">
        <MensagemDeErro>{estado.erro}</MensagemDeErro>
        {estado.sucesso ? <MensagemDeSucesso>{estado.sucesso}</MensagemDeSucesso> : null}
      </div>
    </form>
  )
}

export function ConferirSemSaldo({ itemId }: { itemId: number }) {
  const [estado, setEstado] = useState<EstadoVenda>(INICIAL)
  const [enviando, iniciar] = useTransition()
  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="outline" disabled={enviando} onClick={() => iniciar(async () => setEstado(await conferirVendaSemSaldo(itemId)))}>
        Marcar como conferido
      </Button>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
    </div>
  )
}
