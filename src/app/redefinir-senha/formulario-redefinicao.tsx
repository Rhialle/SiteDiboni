"use client"

import { useActionState, useId } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { salvarSenha, type EstadoRedefinicao } from "./acoes"

const estadoInicial: EstadoRedefinicao = { erro: "" }

export function FormularioRedefinicao() {
  const id = useId()
  const [estado, acao, enviando] = useActionState(salvarSenha, estadoInicial)

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-senha`}>Nova senha</Label>
        <Input id={`${id}-senha`} name="senha" type="password" autoComplete="new-password" required />
        <p className="text-xs text-muted-foreground">Pelo menos 8 caracteres.</p>
      </div>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar senha"}
      </Button>
    </form>
  )
}
