"use client"

import { useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"

import { alterarInativo } from "./acoes"

export function BotaoInativar({ produtoId, inativo }: { produtoId: string; inativo: boolean }) {
  const [erro, setErro] = useState("")
  const [executando, iniciar] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={executando}
        onClick={() => iniciar(async () => setErro((await alterarInativo(produtoId, !inativo)).erro))}
      >
        {inativo ? "Reativar produto" : "Inativar produto"}
      </Button>
      <MensagemDeErro>{erro}</MensagemDeErro>
    </div>
  )
}
