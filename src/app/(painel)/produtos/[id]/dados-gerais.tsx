"use client"

import { useActionState } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import type { CamposDoProduto } from "@/lib/catalogo/produto-form"

import { CamposProduto } from "../campos-produto"
import { salvarDadosGerais, type EstadoDados } from "./acoes"

const estadoInicial: EstadoDados = { erro: "", sucesso: "", valores: null }

export function DadosGerais({
  produtoId,
  salvos,
  categorias,
  materiais,
}: {
  produtoId: string
  salvos: CamposDoProduto
  categorias: { id: string; caminho: string }[]
  materiais: { id: string; nome: string }[]
}) {
  const [estado, acao, enviando] = useActionState(salvarDadosGerais.bind(null, produtoId), estadoInicial)

  return (
    <form action={acao} className="flex max-w-2xl flex-col gap-6">
      <CamposProduto categorias={categorias} materiais={materiais} valores={estado.valores ?? salvos} />
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      {estado.sucesso ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{estado.sucesso}</p> : null}
      <Button type="submit" className="self-start" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar dados"}
      </Button>
    </form>
  )
}
