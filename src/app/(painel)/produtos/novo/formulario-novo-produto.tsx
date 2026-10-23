"use client"

import { useActionState, useId } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { CamposProduto } from "../campos-produto"
import { criarProduto, type EstadoProdutoNovo } from "./acoes"

const estadoInicial: EstadoProdutoNovo = { erro: "", valores: null }

export function FormularioNovoProduto({
  categorias,
  materiais,
}: {
  categorias: { id: string; caminho: string }[]
  materiais: { id: string; nome: string }[]
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(criarProduto, estadoInicial)
  const variacao = estado.valores?.variacao

  return (
    <form action={acao} className="flex max-w-2xl flex-col gap-6">
      <CamposProduto categorias={categorias} materiais={materiais} valores={estado.valores?.campos ?? null} />

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-lg font-semibold">Primeira variação</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-variacao`}>Nome da variação</Label>
          <Input id={`${id}-variacao`} name="variacao_nome" placeholder="Padrão" defaultValue={variacao?.nome} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-codigo`}>Código interno</Label>
          <Input id={`${id}-codigo`} name="codigo_interno" placeholder="Gerado se vazio" defaultValue={variacao?.codigo_interno} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-barras`}>Código de barras</Label>
          <Input id={`${id}-barras`} name="codigo_barras" inputMode="numeric" defaultValue={variacao?.codigo_barras} />
        </div>
      </fieldset>

      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      <Button type="submit" size="lg" className="self-start" disabled={enviando}>
        {enviando ? "Criando…" : "Criar produto"}
      </Button>
    </form>
  )
}
