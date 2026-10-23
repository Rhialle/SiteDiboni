"use client"

import Link from "next/link"
import { useId, useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROTULO_SITUACAO, ROTULO_TIPO_VENDA } from "@/lib/catalogo/rotulos"
import { formatarMoeda } from "@/lib/formatacao"

import { categoriaEmMassa, inativarEmMassa, reajustarEmMassa, type ResultadoMassa } from "./acoes-massa"

export type LinhaProduto = {
  id: string
  nome: string
  situacao: string
  tipo_venda: "unidade" | "peso"
  variacoes: number
  menor_preco_centavos: number | null
}

const SELECT = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm"

export function TabelaProdutos({
  produtos,
  podeEditar,
  categorias,
}: {
  produtos: LinhaProduto[]
  podeEditar: boolean
  categorias: { id: string; caminho: string }[]
}) {
  const [selecionados, setSelecionados] = useState<string[]>([])
  const todos = produtos.length > 0 && selecionados.length === produtos.length

  const alternar = (id: string) =>
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]))

  if (produtos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {podeEditar ? (
        <BarraAcoesMassa selecionados={selecionados} categorias={categorias} aoConcluir={() => setSelecionados([])} />
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {podeEditar ? (
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={todos}
                    onChange={() => setSelecionados(todos ? [] : produtos.map((p) => p.id))}
                  />
                </th>
              ) : null}
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium">Situação</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Variações</th>
              <th className="px-3 py-2 font-medium">Preço</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr key={produto.id} className="border-t">
                {podeEditar ? (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${produto.nome}`}
                      checked={selecionados.includes(produto.id)}
                      onChange={() => alternar(produto.id)}
                    />
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <Link href={`/produtos/${produto.id}`} className="font-medium hover:underline">
                    {produto.nome}
                  </Link>
                </td>
                <td className="px-3 py-2">{ROTULO_SITUACAO[produto.situacao] ?? produto.situacao}</td>
                <td className="px-3 py-2">{ROTULO_TIPO_VENDA[produto.tipo_venda]}</td>
                <td className="px-3 py-2">{produto.variacoes}</td>
                <td className="px-3 py-2">
                  {produto.menor_preco_centavos === null
                    ? "—"
                    : `a partir de ${formatarMoeda(produto.menor_preco_centavos)}${produto.tipo_venda === "peso" ? "/kg" : ""}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BarraAcoesMassa({
  selecionados,
  categorias,
  aoConcluir,
}: {
  selecionados: string[]
  categorias: { id: string; caminho: string }[]
  aoConcluir: () => void
}) {
  const id = useId()
  const [percentual, setPercentual] = useState("")
  const [categoria, setCategoria] = useState("")
  const [resultado, setResultado] = useState<ResultadoMassa>({ erro: "", sucesso: "" })
  const [executando, iniciar] = useTransition()

  const executar = (acao: () => Promise<ResultadoMassa>) =>
    iniciar(async () => {
      const r = await acao()
      setResultado(r)
      if (!r.erro) aoConcluir()
    })

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="text-muted-foreground">{selecionados.length} selecionado(s)</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-reajuste`}>Reajuste (%)</Label>
          <Input
            id={`${id}-reajuste`}
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            inputMode="decimal"
            placeholder="10 ou -5"
            className="w-24"
          />
        </div>
        <Button size="sm" disabled={executando} onClick={() => executar(() => reajustarEmMassa(selecionados, percentual))}>
          Aplicar reajuste
        </Button>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-categoria`}>Categoria para aplicar</Label>
          <select id={`${id}-categoria`} className={SELECT} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Escolha…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caminho}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" variant="outline" disabled={executando}
          onClick={() => executar(() => categoriaEmMassa(selecionados, categoria, true))}>
          Incluir categoria
        </Button>
        <Button size="sm" variant="outline" disabled={executando}
          onClick={() => executar(() => categoriaEmMassa(selecionados, categoria, false))}>
          Remover categoria
        </Button>

        <Button size="sm" variant="outline" disabled={executando}
          onClick={() => executar(() => inativarEmMassa(selecionados, true))}>
          Inativar
        </Button>
        <Button size="sm" variant="outline" disabled={executando}
          onClick={() => executar(() => inativarEmMassa(selecionados, false))}>
          Reativar
        </Button>
      </div>
      <MensagemDeErro>{resultado.erro}</MensagemDeErro>
      {resultado.sucesso ? (
        <p role="status" className="text-emerald-700 dark:text-emerald-400">{resultado.sucesso}</p>
      ) : null}
    </div>
  )
}
