"use client"

import { useActionState, useId } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { criarProdutoDoItem, ligarItem, type EstadoLigacao } from "./acoes"

const INICIAL: EstadoLigacao = { erro: "", sucesso: "", valores: null }

function AjudaDoFator({ id, unidade }: { id: string; unidade: string }) {
  return (
    <p id={id} className="text-xs text-muted-foreground">
      Quantas unidades (ou gramas, se for por peso) vêm em 1 {unidade}. Ex.: 1 CX = 100 un.
    </p>
  )
}

// Liga o item a uma variação que já existe, pelo código interno ou de barras.
export function LigarItem({
  notaId,
  itemId,
  unidade,
  codigo,
  fator,
  botao = "Ligar",
}: {
  notaId: string
  itemId: string
  unidade: string
  codigo: string
  fator: string
  botao?: string
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(ligarItem.bind(null, notaId, itemId), INICIAL)
  const valor = (campo: string, padrao: string) => estado.valores?.[campo] ?? padrao

  return (
    <form action={acao} aria-label="Ligar a uma variação" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-codigo`}>Código interno ou de barras</Label>
        <Input id={`${id}-codigo`} name="codigo" defaultValue={valor("codigo", codigo)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-fator`}>Fator</Label>
        <Input
          id={`${id}-fator`}
          name="fator"
          inputMode="numeric"
          aria-describedby={`${id}-ajuda`}
          defaultValue={valor("fator", fator)}
        />
        <AjudaDoFator id={`${id}-ajuda`} unidade={unidade} />
      </div>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      <MensagemDeSucesso>{estado.sucesso}</MensagemDeSucesso>
      <Button type="submit" variant="outline" className="self-start" disabled={enviando}>
        {enviando ? "Ligando…" : botao}
      </Button>
    </form>
  )
}

// Cria o produto (com uma variação) já preenchido com o que veio do XML e liga o item a ele.
export function CriarProdutoDoItem({
  notaId,
  itemId,
  unidade,
  descricao,
  ncm,
  codigoBarras,
  temLotes,
}: {
  notaId: string
  itemId: string
  unidade: string
  descricao: string
  ncm: string
  codigoBarras: string
  temLotes: boolean
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(criarProdutoDoItem.bind(null, notaId, itemId), INICIAL)
  const valor = (campo: string, padrao: string) => estado.valores?.[campo] ?? padrao
  const controla = estado.valores ? estado.valores.controla_validade === "on" : temLotes

  return (
    <form action={acao} aria-label="Criar produto a partir do item" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-nome`}>Nome</Label>
        <Input id={`${id}-nome`} name="nome" maxLength={160} defaultValue={valor("nome", descricao)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-tipo`}>Tipo de venda</Label>
          <select id={`${id}-tipo`} name="tipo_venda" defaultValue={valor("tipo_venda", "unidade")} className="campo-escolha">
            <option value="unidade">Por unidade</option>
            <option value="peso">Por peso (a granel)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="controla_validade" defaultChecked={controla} />
          Controla validade (lote)
        </label>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-ncm`}>NCM</Label>
          <Input id={`${id}-ncm`} name="ncm" inputMode="numeric" defaultValue={valor("ncm", ncm)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-barras`}>Código de barras</Label>
          <Input id={`${id}-barras`} name="codigo_barras" inputMode="numeric" defaultValue={valor("codigo_barras", codigoBarras)} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-fator`}>Fator</Label>
        <Input id={`${id}-fator`} name="fator" inputMode="numeric" aria-describedby={`${id}-ajuda`} defaultValue={valor("fator", "")} />
        <AjudaDoFator id={`${id}-ajuda`} unidade={unidade} />
      </div>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      <MensagemDeSucesso>{estado.sucesso}</MensagemDeSucesso>
      <Button type="submit" variant="outline" className="self-start" disabled={enviando}>
        {enviando ? "Criando…" : "Criar produto e ligar"}
      </Button>
    </form>
  )
}
