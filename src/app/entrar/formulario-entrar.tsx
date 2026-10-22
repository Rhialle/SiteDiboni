"use client"

import Link from "next/link"
import { useActionState } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { entrar, type EstadoEntrar } from "./acoes"

const estadoInicial: EstadoEntrar = { erro: "" }

export function FormularioEntrar({ aviso }: { aviso?: string }) {
  const [estado, acao, enviando] = useActionState(entrar, estadoInicial)

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      <MensagemDeErro>{estado.erro || aviso}</MensagemDeErro>
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
      <Link
        href="/recuperar-senha"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Esqueci minha senha
      </Link>
    </form>
  )
}
