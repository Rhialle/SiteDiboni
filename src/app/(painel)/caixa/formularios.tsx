"use client"

import { useActionState, useId, useState, useTransition } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { abrirCaixa, conferirCaixa, fecharCaixa, registrarMovimento, type EstadoCaixa } from "./acoes"

const INICIAL: EstadoCaixa = { erro: "", sucesso: "" }

function Retorno({ estado }: { estado: EstadoCaixa }) {
  return (
    <>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      {estado.sucesso ? <MensagemDeSucesso>{estado.sucesso}</MensagemDeSucesso> : null}
    </>
  )
}

export function AbrirCaixa() {
  const id = useId()
  const [estado, acao, enviando] = useActionState(abrirCaixa, INICIAL)
  return (
    <form action={acao} className="vidro flex max-w-md flex-col gap-4 rounded-3xl p-5">
      <h2 className="text-xl font-semibold">Abrir caixa</h2>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-troco`}>Troco inicial</Label>
        <Input id={`${id}-troco`} name="troco" inputMode="decimal" placeholder="0,00" required className="w-40" />
      </div>
      <Button type="submit" disabled={enviando} className="w-fit">
        Abrir caixa
      </Button>
      <Retorno estado={estado} />
    </form>
  )
}

export function MovimentoCaixa() {
  const id = useId()
  const [estado, acao, enviando] = useActionState(registrarMovimento, INICIAL)
  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 text-sm">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">Tipo</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="tipo" value="retirada" defaultChecked /> Retirada
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="tipo" value="reforco" /> Reforço
          </label>
        </div>
      </fieldset>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-valor`}>Valor</Label>
        <Input id={`${id}-valor`} name="valor" inputMode="decimal" required className="w-32" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-motivo`}>Motivo</Label>
        <Input id={`${id}-motivo`} name="motivo" required maxLength={120} className="w-64" placeholder="Ex.: pagar o entregador" />
      </div>
      <Button type="submit" variant="outline" disabled={enviando}>
        Registrar
      </Button>
      <div className="w-full">
        <Retorno estado={estado} />
      </div>
    </form>
  )
}

// Às cegas: o esperado não aparece aqui; só no resumo, depois de fechar.
export function FecharCaixa() {
  const id = useId()
  const [estado, acao, enviando] = useActionState(fecharCaixa, INICIAL)
  return (
    <form action={acao} className="vidro flex max-w-xl flex-col gap-4 rounded-3xl p-5">
      <h2 className="text-xl font-semibold">Fechar caixa</h2>
      <p className="text-sm text-muted-foreground">
        Conte o dinheiro da gaveta e, se quiser, confira os totais da maquininha e do Pix. O sistema mostra o que
        esperava depois de fechar.
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-dinheiro`}>Dinheiro contado</Label>
          <Input id={`${id}-dinheiro`} name="dinheiro" inputMode="decimal" required className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-credito`}>Crédito</Label>
          <Input id={`${id}-credito`} name="credito" inputMode="decimal" className="w-32" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-debito`}>Débito</Label>
          <Input id={`${id}-debito`} name="debito" inputMode="decimal" className="w-32" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-pix`}>Pix</Label>
          <Input id={`${id}-pix`} name="pix" inputMode="decimal" className="w-32" />
        </div>
      </div>
      <Button
        type="submit"
        disabled={enviando}
        className="w-fit"
        onClick={(evento) => {
          if (!window.confirm("Fechar o caixa? Depois de fechado, ele não reabre.")) evento.preventDefault()
        }}
      >
        Fechar caixa
      </Button>
      <Retorno estado={estado} />
    </form>
  )
}

export function ConferirCaixa({ caixaId }: { caixaId: number }) {
  const [estado, setEstado] = useState<EstadoCaixa>(INICIAL)
  const [enviando, iniciar] = useTransition()
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="w-fit"
        disabled={enviando}
        onClick={() => iniciar(async () => setEstado(await conferirCaixa(caixaId)))}
      >
        Marcar como conferido
      </Button>
      <Retorno estado={estado} />
    </div>
  )
}
