"use client"

import { useId, useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { estornar } from "./acoes"

// Fica na linha mesmo depois do estorno (sem o botão), para a mensagem continuar visível.
export function BotaoEstornar({ id, estornada }: { id: number; estornada: boolean }) {
  const campoId = useId()
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [resultado, setResultado] = useState({ erro: "", sucesso: "" })
  const [executando, iniciar] = useTransition()

  const confirmar = () =>
    iniciar(async () => {
      const r = await estornar(id, motivo)
      setResultado(r)
      if (!r.erro) setAberto(false)
    })

  return (
    <div className="flex flex-col items-start gap-2">
      {!estornada && !aberto ? (
        <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
          Estornar
        </Button>
      ) : null}
      {!estornada && aberto ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${campoId}-motivo`}>Motivo do estorno</Label>
          <Input id={`${campoId}-motivo`} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-56" />
          <div className="flex gap-2">
            <Button size="sm" disabled={executando} onClick={confirmar}>
              Confirmar estorno
            </Button>
            <Button size="sm" variant="ghost" disabled={executando} onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
      <MensagemDeErro>{resultado.erro}</MensagemDeErro>
      {resultado.sucesso ? (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {resultado.sucesso}
        </p>
      ) : null}
    </div>
  )
}
