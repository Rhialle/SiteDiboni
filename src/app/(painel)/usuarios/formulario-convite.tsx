"use client"

import { useActionState, useId } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { convidarUsuario, type EstadoConvite } from "./acoes"

const estadoInicial: EstadoConvite = {
  erro: "",
  sucesso: "",
  valores: { nome: "", email: "", papel: "funcionario" },
}

export function FormularioConvite() {
  const id = useId()
  const [estado, acao, enviando] = useActionState(convidarUsuario, estadoInicial)

  return (
    <form action={acao} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-nome`}>Nome</Label>
        <Input id={`${id}-nome`} name="nome" defaultValue={estado.valores.nome} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>E-mail</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          defaultValue={estado.valores.email}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-papel`}>Papel</Label>
        <select
          id={`${id}-papel`}
          name="papel"
          defaultValue={estado.valores.papel}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="funcionario">Funcionário</option>
          <option value="administrador">Administrador</option>
        </select>
      </div>
      <Button type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Convidar"}
      </Button>
      <div className="sm:col-span-4">
        <MensagemDeErro>{estado.erro}</MensagemDeErro>
        {estado.sucesso ? (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {estado.sucesso}
          </p>
        ) : null}
      </div>
    </form>
  )
}
