"use client"

import Link from "next/link"
import { useActionState, useId } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MENSAGENS } from "@/lib/mensagens"

import { pedirRecuperacao, type EstadoRecuperacao } from "./acoes"

const estadoInicial: EstadoRecuperacao = { enviado: false }

export function FormularioRecuperacao() {
  const id = useId()
  const [estado, acao, enviando] = useActionState(pedirRecuperacao, estadoInicial)

  if (estado.enviado) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <p role="status">{MENSAGENS.recuperacaoPedida}</p>
        <Link href="/entrar" className="text-muted-foreground underline-offset-4 hover:underline">
          Voltar para entrar
        </Link>
      </div>
    )
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>E-mail</Label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
      </div>
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar link"}
      </Button>
      <Link
        href="/entrar"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Voltar para entrar
      </Link>
    </form>
  )
}
