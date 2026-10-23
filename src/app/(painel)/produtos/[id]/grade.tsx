"use client"

import { useActionState, useId } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import { gerarGrade, type EstadoFicha } from "./acoes"

export function Grade({ produtoId }: { produtoId: string }) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(gerarGrade.bind(null, produtoId), { erro: "", sucesso: "" } as EstadoFicha)

  return (
    <form action={acao} className="flex max-w-md flex-col gap-2">
      <Label htmlFor={`${id}-grade`}>Atributos da grade</Label>
      <textarea
        id={`${id}-grade`}
        name="grade"
        rows={3}
        required
        placeholder={"Tamanho: 4, 6, 12\nCor: marrom, branca"}
        className="rounded-lg border border-input bg-transparent px-2.5 py-1 font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Um atributo por linha. O sistema cria as combinações que ainda não existem.
      </p>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      {estado.sucesso ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{estado.sucesso}</p> : null}
      <Button type="submit" variant="outline" className="self-start" disabled={enviando}>
        Gerar variações
      </Button>
    </form>
  )
}
