"use client"

import { useActionState, useId, useState } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROTULO_ESCOPO_INVENTARIO } from "@/lib/inventario/rotulos"

import { abrirInventario, type EstadoAbertura } from "./acoes"

const INICIAL: EstadoAbertura = { erro: "", valores: null }

// Só o administrador abre: descrição, escopo e, conforme o escopo, as categorias ou os códigos internos.
export function AbrirInventario({ categorias }: { categorias: { id: string; caminho: string }[] }) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(abrirInventario, INICIAL)
  const [escopo, setEscopo] = useState(estado.valores?.escopo ?? "loja")
  const marcadas = new Set((estado.valores?.categorias ?? "").split(",").filter(Boolean))

  return (
    <section aria-labelledby={`${id}-titulo`} className="vidro flex flex-col gap-4 rounded-3xl p-5">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold">
        Abrir inventário
      </h2>
      <form action={acao} className="flex max-w-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-descricao`}>Descrição</Label>
          <Input
            id={`${id}-descricao`}
            name="descricao"
            maxLength={120}
            placeholder="Ex.: Prateleira das forminhas"
            defaultValue={estado.valores?.descricao}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Escopo</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(ROTULO_ESCOPO_INVENTARIO).map(([valor, rotulo]) => (
              <label key={valor} className="flex items-center gap-2">
                <input type="radio" name="escopo" value={valor} checked={escopo === valor} onChange={() => setEscopo(valor)} />
                {rotulo}
              </label>
            ))}
          </div>
        </fieldset>
        {escopo === "categorias" ? (
          <fieldset className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
            <legend className="mb-1 font-medium">Categorias (inclui as subcategorias)</legend>
            {categorias.length === 0 ? <p className="text-muted-foreground">Nenhuma categoria cadastrada.</p> : null}
            {categorias.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input type="checkbox" name="categorias" value={c.id} defaultChecked={marcadas.has(c.id)} />
                {c.caminho}
              </label>
            ))}
          </fieldset>
        ) : null}
        {escopo === "variacoes" ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-codigos`}>Códigos internos</Label>
            <textarea
              id={`${id}-codigos`}
              name="codigos"
              rows={5}
              className="campo-texto"
              placeholder="Um por linha"
              defaultValue={estado.valores?.codigos}
            />
          </div>
        ) : null}
        <MensagemDeErro>{estado.erro}</MensagemDeErro>
        <Button type="submit" className="self-start" disabled={enviando}>
          {enviando ? "Abrindo…" : "Abrir inventário"}
        </Button>
      </form>
    </section>
  )
}
