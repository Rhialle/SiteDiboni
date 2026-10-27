"use client"

import { useActionState, useId } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { UnidadeDeDigitacao } from "@/lib/estoque/quantidade"

import { registrarEntrada, type EstadoEstoque } from "./acoes"

const SELECT = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
const INICIAL: EstadoEstoque = { erro: "", sucesso: "", valores: null }

// Entrada sem nota (só administrador): custo e motivo obrigatórios; validade só se o produto controla.
export function EntradaManual({
  variacaoId,
  unidades,
  controlaValidade,
}: {
  variacaoId: string
  unidades: UnidadeDeDigitacao[]
  controlaValidade: boolean
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(registrarEntrada.bind(null, variacaoId), INICIAL)
  const valor = (campo: string) => estado.valores?.[campo] ?? ""

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 id={`${id}-titulo`} className="text-lg font-semibold">
        Entrada manual
      </h2>
      <form action={acao} className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-quantidade`}>Quantidade</Label>
          <Input id={`${id}-quantidade`} name="quantidade" inputMode="decimal" defaultValue={valor("quantidade")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-em`}>Em</Label>
          <select id={`${id}-em`} name="em" defaultValue={valor("em") || unidades[0]?.valor} className={SELECT}>
            {unidades.map((unidade) => (
              <option key={unidade.valor} value={unidade.valor}>
                {unidade.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-custo`}>Custo (R$)</Label>
          <Input id={`${id}-custo`} name="custo" inputMode="decimal" placeholder="12,00" defaultValue={valor("custo")} />
          <p className="text-xs text-muted-foreground">Pela unidade escolhida em “Em” (ex.: o preço da caixa). Brinde: 0,00.</p>
        </div>
        {controlaValidade ? (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-validade`}>Validade</Label>
              <Input id={`${id}-validade`} name="validade" type="date" defaultValue={valor("validade")} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-lote`}>Lote (opcional)</Label>
              <Input id={`${id}-lote`} name="lote" defaultValue={valor("lote")} />
            </div>
          </>
        ) : null}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor={`${id}-motivo`}>Motivo</Label>
          <Input id={`${id}-motivo`} name="motivo" placeholder="Ex.: compra sem nota, brinde do fornecedor" defaultValue={valor("motivo")} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <MensagemDeErro>{estado.erro}</MensagemDeErro>
          {estado.sucesso ? (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
              {estado.sucesso}
            </p>
          ) : null}
          <Button type="submit" className="self-start" disabled={enviando}>
            {enviando ? "Registrando…" : "Registrar entrada"}
          </Button>
        </div>
      </form>
    </section>
  )
}
