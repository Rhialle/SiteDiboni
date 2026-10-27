"use client"

import Link from "next/link"
import { useActionState, useId, useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { alterarVariacaoAtiva, salvarVariacao, type EstadoFicha } from "./acoes"

export type Variacao = {
  id: string
  nome: string
  codigo_interno: string
  codigo_barras: string | null
  comprimento_mm: number | null
  largura_mm: number | null
  altura_mm: number | null
  capacidade_ml: number | null
  estoque_minimo: number
  ativa: boolean
}

function medidas(v: Variacao): string {
  const dimensoes = [v.comprimento_mm, v.largura_mm, v.altura_mm]
  const partes = dimensoes.every((d) => d) ? [`${dimensoes.join(" × ")} mm`] : []
  if (v.capacidade_ml) partes.push(`${v.capacidade_ml} ml`)
  return partes.join(" · ") || "—"
}

export function Variacoes({
  produtoId,
  variacoes,
  podeEditar,
  unidade,
}: {
  produtoId: string
  variacoes: Variacao[]
  podeEditar: boolean
  unidade: string
}) {
  const [erro, setErro] = useState("")
  const [executando, iniciar] = useTransition()

  return (
    <div className="flex flex-col gap-4">
      <MensagemDeErro>{erro}</MensagemDeErro>
      <div className="overflow-x-auto rounded-lg border">
        <table aria-label="Variações" className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Variação</th>
              <th className="px-3 py-2 font-medium">Código interno</th>
              <th className="px-3 py-2 font-medium">Código de barras</th>
              <th className="px-3 py-2 font-medium">Medidas</th>
              <th className="px-3 py-2 font-medium">Estoque mínimo</th>
              <th className="px-3 py-2 font-medium">Situação</th>
              {podeEditar ? <th className="px-3 py-2 font-medium"><span className="sr-only">Ações</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {variacoes.map((v) => (
              <tr key={v.id} className="border-t align-top">
                <td className="px-3 py-2">
                  <span className="font-medium">{v.nome}</span>
                  <Link href={`/estoque/${v.id}`} className="block text-xs text-muted-foreground underline-offset-4 hover:underline">
                    Ver estoque
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono">{v.codigo_interno}</td>
                <td className="px-3 py-2 font-mono">{v.codigo_barras ?? "—"}</td>
                <td className="px-3 py-2">{medidas(v)}</td>
                <td className="px-3 py-2">{v.estoque_minimo} {unidade}</td>
                <td className="px-3 py-2">{v.ativa ? "Ativa" : "Inativa"}</td>
                {podeEditar ? (
                  <td className="px-3 py-2">
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={executando}
                        onClick={() => {
                          setErro("")
                          iniciar(async () => setErro((await alterarVariacaoAtiva(produtoId, v.id, !v.ativa)).erro))
                        }}
                      >
                        {v.ativa ? "Inativar" : "Reativar"} {v.nome}
                      </Button>
                      <details className="w-full">
                        <summary className="cursor-pointer text-xs text-muted-foreground">Editar</summary>
                        <FormularioVariacao produtoId={produtoId} variacao={v} />
                      </details>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {podeEditar ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Nova variação</h3>
          <FormularioVariacao produtoId={produtoId} />
        </div>
      ) : null}
    </div>
  )
}

function FormularioVariacao({ produtoId, variacao }: { produtoId: string; variacao?: Variacao }) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(salvarVariacao.bind(null, produtoId), { erro: "", sucesso: "" } as EstadoFicha)
  const campo = (nome: string, rotulo: string, valor?: string | number | null, extra: object = {}) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`${id}-${nome}`}>{rotulo}</Label>
      <Input id={`${id}-${nome}`} name={nome} defaultValue={valor ?? ""} {...extra} />
    </div>
  )

  return (
    <form action={acao} className="grid gap-3 py-2 sm:grid-cols-4">
      {variacao ? <input type="hidden" name="variacao_id" value={variacao.id} /> : null}
      {campo("nome", "Nome da variação", variacao?.nome, { required: !variacao })}
      {campo("codigo_interno", "Código interno", variacao?.codigo_interno, { placeholder: "Gerado se vazio" })}
      {campo("codigo_barras", "Código de barras", variacao?.codigo_barras, { inputMode: "numeric" })}
      {campo("estoque_minimo", "Estoque mínimo", variacao?.estoque_minimo, { inputMode: "numeric" })}
      {campo("comprimento_mm", "Comprimento (mm)", variacao?.comprimento_mm, { inputMode: "numeric" })}
      {campo("largura_mm", "Largura (mm)", variacao?.largura_mm, { inputMode: "numeric" })}
      {campo("altura_mm", "Altura (mm)", variacao?.altura_mm, { inputMode: "numeric" })}
      {campo("capacidade_ml", "Capacidade (ml)", variacao?.capacidade_ml, { inputMode: "numeric" })}
      <div className="flex flex-col gap-2 sm:col-span-4">
        <MensagemDeErro>{estado.erro}</MensagemDeErro>
        {estado.sucesso ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{estado.sucesso}</p> : null}
        <Button type="submit" size="sm" className="self-start" disabled={enviando}>
          {variacao ? "Salvar variação" : "Adicionar variação"}
        </Button>
      </div>
    </form>
  )
}
