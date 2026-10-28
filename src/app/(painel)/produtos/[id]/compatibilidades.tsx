"use client"

import Link from "next/link"
import { useActionState, useId, useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { desligarCompatibilidade, ligarCompatibilidade, type EstadoFicha } from "./acoes"

export type Compatibilidade = {
  id: string
  descricao: string
  daqui: string
  outra: { produtoId: string; produto: string; variacao: string; codigo: string }
}

const SELECT = "campo-escolha"

export function Compatibilidades({
  produtoId,
  variacoes,
  compatibilidades,
  podeEditar,
}: {
  produtoId: string
  variacoes: { id: string; nome: string }[]
  compatibilidades: Compatibilidade[]
  podeEditar: boolean
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(
    ligarCompatibilidade.bind(null, produtoId),
    { erro: "", sucesso: "" } as EstadoFicha,
  )
  const [erro, setErro] = useState("")
  const [executando, iniciar] = useTransition()
  const variasVariacoes = variacoes.length > 1

  return (
    <div className="flex flex-col gap-3 text-sm">
      {compatibilidades.length === 0 ? <p className="text-muted-foreground">Nenhuma compatibilidade.</p> : null}
      <ul aria-label="Compatibilidades" className="flex flex-col gap-1">
        {compatibilidades.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 vidro rounded-2xl px-4 py-3">
            {variasVariacoes ? <span className="text-muted-foreground">{c.daqui} ↔</span> : null}
            <Link href={`/produtos/${c.outra.produtoId}`} className="font-medium hover:underline">
              {c.outra.produto} — {c.outra.variacao}
            </Link>
            <span className="font-mono text-muted-foreground">{c.outra.codigo}</span>
            {c.descricao ? <span>({c.descricao})</span> : null}
            {podeEditar ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={executando}
                onClick={() => {
                  setErro("")
                  iniciar(async () => setErro((await desligarCompatibilidade(produtoId, c.id)).erro))
                }}
              >
                Desligar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {podeEditar ? (
        <form action={acao} className="flex flex-wrap items-end gap-2">
          {variasVariacoes ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-variacao`}>Variação deste produto</Label>
              <select id={`${id}-variacao`} name="variacao_id" className={SELECT}>
                {variacoes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="variacao_id" value={variacoes[0]?.id ?? ""} />
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-codigo`}>Código interno da outra variação</Label>
            <Input id={`${id}-codigo`} name="codigo" required className="w-40 font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-descricao`}>Descrição da ligação</Label>
            <Input id={`${id}-descricao`} name="descricao" placeholder="Ex.: tampa serve no pote" className="w-56" />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={enviando}>
            Ligar variações
          </Button>
        </form>
      ) : null}
      <MensagemDeErro>{estado.erro || erro}</MensagemDeErro>
    </div>
  )
}
