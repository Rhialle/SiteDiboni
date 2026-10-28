"use client"

import { useActionState, useId } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  salvarConfiguracoes,
  type EstadoConfiguracoes,
  type ValoresConfiguracoes,
} from "./acoes"

const estadoInicial: EstadoConfiguracoes = { erro: "", sucesso: "", valores: null }

export function FormularioConfiguracoes({
  salvos,
  limiteAtual,
}: {
  salvos: ValoresConfiguracoes
  limiteAtual: string
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(salvarConfiguracoes, estadoInicial)
  const valores = estado.valores ?? salvos

  return (
    <form action={acao} className="flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-cnpj`}>CNPJ da loja</Label>
        <Input
          id={`${id}-cnpj`}
          name="cnpj"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          defaultValue={valores.cnpj}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-limite`}>Limite de ajuste (R$)</Label>
        <Input id={`${id}-limite`} name="limite" inputMode="decimal" defaultValue={valores.limite} required />
        <p className="text-xs text-muted-foreground">
          Hoje: {limiteAtual}. Ajustes e perdas acima desse valor, feitos por funcionários, precisam
          da aprovação de um administrador.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-dias`}>Dias de alerta de validade</Label>
        <Input id={`${id}-dias`} name="dias" defaultValue={valores.dias} required />
        <p className="text-xs text-muted-foreground">
          Separados por vírgula. Ex.: 30, 15, 7 avisa 30, 15 e 7 dias antes de vencer.
        </p>
      </div>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      {estado.sucesso ? (
        <MensagemDeSucesso>
          {estado.sucesso}
        </MensagemDeSucesso>
      ) : null}
      <Button type="submit" className="self-start" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  )
}
