"use client"

import { useActionState, useId, useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatarMoeda, formatarReais } from "@/lib/formatacao"

import {
  alterarFormaAtiva,
  apagarFaixa,
  salvarFaixa,
  salvarFormaVenda,
  salvarPrecoPorKg,
  type EstadoFicha,
} from "./acoes"

export type FormaVenda = {
  id: string
  variacao_id: string
  nome: string
  fator: number
  preco_centavos: number
  peso_variavel: boolean
  ativa: boolean
  faixas: { id: string; quantidade_minima: number; preco_centavos: number }[]
}

const INICIAL: EstadoFicha = { erro: "", sucesso: "" }

function Retorno({ estado }: { estado: EstadoFicha }) {
  return (
    <>
      <MensagemDeErro>{estado.erro}</MensagemDeErro>
      {estado.sucesso ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{estado.sucesso}</p> : null}
    </>
  )
}

export function FormasVenda({
  produtoId,
  porPeso,
  variacoes,
  formas,
  podeEditar,
}: {
  produtoId: string
  porPeso: boolean
  variacoes: { id: string; nome: string }[]
  formas: FormaVenda[]
  podeEditar: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      {variacoes.map((variacao) => {
        const daVariacao = formas.filter((f) => f.variacao_id === variacao.id)
        return (
          <section key={variacao.id} aria-label={`Formas de venda de ${variacao.nome}`} className="flex flex-col gap-3">
            {variacoes.length > 1 ? <h3 className="font-medium">{variacao.nome}</h3> : null}
            {porPeso ? (
              <PrecoPorKg
                produtoId={produtoId}
                variacaoId={variacao.id}
                granel={daVariacao.find((f) => f.peso_variavel)}
                podeEditar={podeEditar}
              />
            ) : (
              <>
                {daVariacao.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma forma de venda.</p>
                ) : null}
                {daVariacao.map((forma) => (
                  <Forma key={forma.id} produtoId={produtoId} forma={forma} podeEditar={podeEditar} />
                ))}
                {podeEditar ? <NovaForma produtoId={produtoId} variacaoId={variacao.id} /> : null}
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}

function Forma({ produtoId, forma, podeEditar }: { produtoId: string; forma: FormaVenda; podeEditar: boolean }) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(salvarFaixa.bind(null, produtoId, forma.id), INICIAL)
  const [erro, setErro] = useState("")
  const [executando, iniciar] = useTransition()
  const executar = (fazer: () => Promise<EstadoFicha>) => {
    setErro("")
    iniciar(async () => setErro((await fazer()).erro))
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <legend className="px-1 font-medium">{forma.nome}</legend>
      <p>
        {formatarMoeda(forma.preco_centavos)} · {forma.fator} un. {forma.ativa ? null : <span className="text-muted-foreground">(inativa)</span>}
      </p>
      {forma.faixas.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {forma.faixas.map((faixa) => (
            <li key={faixa.id} className="flex items-center gap-2">
              a partir de {faixa.quantidade_minima}: {formatarMoeda(faixa.preco_centavos)}
              {podeEditar ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Apagar faixa a partir de ${faixa.quantidade_minima}`}
                  disabled={executando}
                  onClick={() => executar(() => apagarFaixa(produtoId, faixa.id))}
                >
                  ×
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {podeEditar ? (
        <>
          <form action={acao} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-qtd`}>A partir de</Label>
              <Input id={`${id}-qtd`} name="quantidade_minima" inputMode="numeric" required className="w-24" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-preco`}>Preço da faixa (R$)</Label>
              <Input id={`${id}-preco`} name="preco" inputMode="decimal" required className="w-28" />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={enviando}>
              Adicionar faixa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={executando}
              onClick={() => executar(() => alterarFormaAtiva(produtoId, forma.id, !forma.ativa))}
            >
              {forma.ativa ? "Inativar forma" : "Reativar forma"}
            </Button>
          </form>
          <Retorno estado={{ erro: estado.erro || erro, sucesso: "" }} />
        </>
      ) : null}
    </fieldset>
  )
}

function NovaForma({ produtoId, variacaoId }: { produtoId: string; variacaoId: string }) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(salvarFormaVenda.bind(null, produtoId, variacaoId), INICIAL)

  return (
    <form action={acao} className="flex flex-wrap items-end gap-2 text-sm">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-nome`}>Nome da forma</Label>
        <Input id={`${id}-nome`} name="nome" required placeholder="Pacote com 100" className="w-44" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-fator`}>Quantidade na forma</Label>
        <Input id={`${id}-fator`} name="fator" inputMode="numeric" required className="w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-preco`}>Preço (R$)</Label>
        <Input id={`${id}-preco`} name="preco" inputMode="decimal" required className="w-28" />
      </div>
      <Button type="submit" size="sm" disabled={enviando}>
        Adicionar forma
      </Button>
      <div className="w-full">
        <Retorno estado={estado} />
      </div>
    </form>
  )
}

function PrecoPorKg({
  produtoId,
  variacaoId,
  granel,
  podeEditar,
}: {
  produtoId: string
  variacaoId: string
  granel: FormaVenda | undefined
  podeEditar: boolean
}) {
  const id = useId()
  const [estado, acao, enviando] = useActionState(salvarPrecoPorKg.bind(null, produtoId, variacaoId), INICIAL)

  if (!podeEditar) {
    return <p className="text-sm">{granel ? `${formatarMoeda(granel.preco_centavos)}/kg` : "Sem preço por kg."}</p>
  }

  return (
    <form action={acao} className="flex flex-wrap items-end gap-2 text-sm">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-preco`}>Preço por kg (R$)</Label>
        <Input
          id={`${id}-preco`}
          name="preco"
          inputMode="decimal"
          required
          defaultValue={granel ? formatarReais(granel.preco_centavos) : ""}
          className="w-32"
        />
      </div>
      <Button type="submit" size="sm" disabled={enviando}>
        Salvar preço por kg
      </Button>
      <div className="w-full">
        <Retorno estado={estado} />
      </div>
    </form>
  )
}
