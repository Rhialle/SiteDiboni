"use client"

import { useActionState, useId, useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { apagarMaterial, criarMaterial } from "./acoes"

export function ListaMateriais({ materiais }: { materiais: { id: string; nome: string }[] }) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(criarMaterial, { erro: "" })
  const [erroItem, setErroItem] = useState("")
  const [executando, iniciar] = useTransition()

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Materiais</h2>
      <form action={acao} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-nome`}>Novo material</Label>
          <Input id={`${id}-nome`} name="nome" required className="w-56" placeholder="Ex.: kraft, PET, alumínio" />
        </div>
        <Button type="submit" disabled={enviando}>
          Adicionar material
        </Button>
      </form>
      <MensagemDeErro>{estado.erro || erroItem}</MensagemDeErro>

      {materiais.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum material ainda.</p>
      ) : (
        <ul aria-label="Materiais" className="flex flex-wrap gap-2">
          {materiais.map((material) => (
            <li key={material.id} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-sm">
              {material.nome}
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Apagar material ${material.nome}`}
                disabled={executando}
                onClick={() => {
                  setErroItem("")
                  iniciar(async () => setErroItem((await apagarMaterial(material.id)).erro))
                }}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
