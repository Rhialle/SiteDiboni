"use client"

import { useActionState, useId, useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { caminhosDasCategorias, type NoCategoria } from "@/lib/catalogo/arvore"

import {
  apagarCategoria,
  criarCategoria,
  moverCategoria,
  renomearCategoria,
  type ResultadoCategoria,
} from "./acoes"

const SELECT =
  "campo-escolha disabled:opacity-50"

export function ArvoreCategorias({ arvore }: { arvore: NoCategoria[] }) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(criarCategoria, { erro: "" })
  const [erroItem, setErroItem] = useState("")
  const [executando, iniciar] = useTransition()
  const caminhos = caminhosDasCategorias(arvore)

  function executar(acaoItem: () => Promise<ResultadoCategoria>) {
    setErroItem("")
    iniciar(async () => setErroItem((await acaoItem()).erro))
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Categorias</h2>
      <form action={acao} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-nome`}>Nova categoria</Label>
          <Input id={`${id}-nome`} name="nome" required className="w-56" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-pai`}>Dentro de</Label>
          <select id={`${id}-pai`} name="pai" className={SELECT} defaultValue="">
            <option value="">Raiz</option>
            {caminhos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caminho}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={enviando}>
          Criar categoria
        </Button>
      </form>
      <MensagemDeErro>{estado.erro || erroItem}</MensagemDeErro>

      {arvore.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma categoria ainda.</p>
      ) : (
        <ListaDeCategorias
          nos={arvore}
          caminhos={caminhos}
          desabilitado={executando}
          executar={executar}
          rotulo="Categorias da loja"
        />
      )}
    </section>
  )
}

function ListaDeCategorias({
  nos,
  caminhos,
  desabilitado,
  executar,
  rotulo,
}: {
  nos: NoCategoria[]
  caminhos: { id: string; caminho: string }[]
  desabilitado: boolean
  executar: (acao: () => Promise<ResultadoCategoria>) => void
  rotulo: string
}) {
  return (
    <ul aria-label={rotulo} className="flex flex-col gap-1 border-l pl-4">
      {nos.map((no) => (
        <li key={no.id} className="flex flex-col gap-1">
          <ItemCategoria no={no} caminhos={caminhos} desabilitado={desabilitado} executar={executar} />
          {no.filhas.length > 0 ? (
            <ListaDeCategorias
              nos={no.filhas}
              caminhos={caminhos}
              desabilitado={desabilitado}
              executar={executar}
              rotulo={`Dentro de ${no.nome}`}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function ItemCategoria({
  no,
  caminhos,
  desabilitado,
  executar,
}: {
  no: NoCategoria
  caminhos: { id: string; caminho: string }[]
  desabilitado: boolean
  executar: (acao: () => Promise<ResultadoCategoria>) => void
}) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(no.nome)

  return (
    <div className="flex flex-wrap items-center gap-2 py-1 text-sm">
      {editando ? (
        <>
          <Input
            aria-label={`Novo nome de ${no.nome}`}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-7 w-48"
          />
          <Button
            size="sm"
            disabled={desabilitado}
            onClick={() => {
              setEditando(false)
              executar(() => renomearCategoria(no.id, nome))
            }}
          >
            Salvar nome
          </Button>
        </>
      ) : (
        <span className="font-medium">{no.nome}</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Renomear ${no.nome}`}
        disabled={desabilitado}
        onClick={() => setEditando((v) => !v)}
      >
        Renomear
      </Button>
      <select
        aria-label={`Mover ${no.nome} para`}
        className={SELECT}
        disabled={desabilitado}
        value={no.categoria_pai_id ?? ""}
        onChange={(e) => executar(() => moverCategoria(no.id, e.target.value || null))}
      >
        <option value="">Raiz</option>
        {caminhos
          .filter((c) => c.id !== no.id)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.caminho}
            </option>
          ))}
      </select>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Apagar ${no.nome}`}
        disabled={desabilitado}
        onClick={() => executar(() => apagarCategoria(no.id))}
      >
        Apagar
      </Button>
    </div>
  )
}
