"use client"

import { useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"

import { decidirSolicitacao } from "./acoes"

export function BotoesDecisao({ id }: { id: number }) {
  const [erro, setErro] = useState("")
  const [executando, iniciar] = useTransition()
  const decidir = (aprovar: boolean) =>
    iniciar(async () => {
      setErro((await decidirSolicitacao(id, aprovar)).erro)
    })

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-2">
        <Button size="sm" disabled={executando} onClick={() => decidir(true)}>
          Aprovar
        </Button>
        <Button size="sm" variant="outline" disabled={executando} onClick={() => decidir(false)}>
          Recusar
        </Button>
      </div>
      <MensagemDeErro>{erro}</MensagemDeErro>
    </div>
  )
}
