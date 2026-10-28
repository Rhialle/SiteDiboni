"use client"

import { useId } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CamposDoProduto } from "@/lib/catalogo/produto-form"
import { ORIGENS_FISCAIS, PROPRIEDADES } from "@/lib/catalogo/rotulos"

const SELECT = "campo-escolha"

// Campos do produto, usados no cadastro de produto novo e nos dados da ficha.
export function CamposProduto({
  categorias,
  materiais,
  valores,
}: {
  categorias: { id: string; caminho: string }[]
  materiais: { id: string; nome: string }[]
  valores: CamposDoProduto | null
}) {
  const id = useId()
  const marcado = (campo: string) => valores?.marcados.includes(campo) ?? false

  return (
    <>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Dados do produto</legend>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={`${id}-nome`}>Nome</Label>
          <Input id={`${id}-nome`} name="nome" required maxLength={160} defaultValue={valores?.nome} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={`${id}-descricao`}>Descrição</Label>
          <textarea
            id={`${id}-descricao`}
            name="descricao"
            rows={3}
            defaultValue={valores?.descricao}
            className="campo-texto"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-tipo`}>Tipo de venda</Label>
          <select id={`${id}-tipo`} name="tipo_venda" className={SELECT} defaultValue={valores?.tipo_venda ?? "unidade"}>
            <option value="unidade">Por unidade</option>
            <option value="peso">Por peso (a granel)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="controla_validade" defaultChecked={marcado("controla_validade")} />
          Controla validade (lote)
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-lg font-semibold">Dados fiscais</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-ncm`}>NCM</Label>
          <Input id={`${id}-ncm`} name="ncm" inputMode="numeric" defaultValue={valores?.ncm} placeholder="8 dígitos" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-cest`}>CEST</Label>
          <Input id={`${id}-cest`} name="cest" inputMode="numeric" defaultValue={valores?.cest} placeholder="7 dígitos, se houver" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-origem`}>Origem</Label>
          <select id={`${id}-origem`} name="origem_fiscal" className={SELECT} defaultValue={valores?.origem_fiscal ?? ""}>
            <option value="">Não informada</option>
            {ORIGENS_FISCAIS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-semibold">Uso</legend>
        {PROPRIEDADES.map((p) => (
          <label key={p.campo} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={p.campo} defaultChecked={marcado(p.campo)} />
            {p.rotulo}
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Categorias e materiais</legend>
        <div className="flex flex-col gap-1 text-sm">
          {categorias.length === 0 ? <p className="text-muted-foreground">Nenhuma categoria cadastrada.</p> : null}
          {categorias.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input type="checkbox" name="categorias" value={c.id} defaultChecked={valores?.categorias.includes(c.id)} />
              {c.caminho}
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-1 text-sm">
          {materiais.length === 0 ? <p className="text-muted-foreground">Nenhum material cadastrado.</p> : null}
          {materiais.map((m) => (
            <label key={m.id} className="flex items-center gap-2">
              <input type="checkbox" name="etiquetas" value={m.id} defaultChecked={valores?.etiquetas.includes(m.id)} />
              {m.nome}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  )
}
