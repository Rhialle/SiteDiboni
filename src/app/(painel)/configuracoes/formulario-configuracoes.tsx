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
          // O CNPJ pode ter letras (formato alfanumérico de 2026): teclado comum, em maiúsculas.
          autoCapitalize="characters"
          spellCheck={false}
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
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-desconto`}>Limite de desconto da funcionária (%)</Label>
        <Input id={`${id}-desconto`} name="desconto" inputMode="numeric" defaultValue={valores.desconto} required className="w-28" />
        <p className="text-xs text-muted-foreground">
          No balcão, a funcionária dá desconto até esse percentual da venda; acima, só o administrador.
        </p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Largura do cupom</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="cupom" value="80" defaultChecked={valores.cupom !== "58"} /> 80 mm
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="cupom" value="58" defaultChecked={valores.cupom === "58"} /> 58 mm
          </label>
        </div>
      </fieldset>
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
