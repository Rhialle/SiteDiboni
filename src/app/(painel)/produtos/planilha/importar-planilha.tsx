"use client"

import { useId, useState, useTransition, type FormEvent } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MENSAGENS } from "@/lib/mensagens"

import { gravarPlanilha, preverPlanilha, type ResultadoDaPlanilha } from "./acoes"

const VAZIO: ResultadoDaPlanilha = { erro: "", sucesso: "", resumo: "", erros: [], podeImportar: false }

// O navegador guarda o arquivo escolhido: a prévia e a importação mandam o mesmo arquivo, e o
// servidor confere de novo antes de gravar. Trocar de arquivo limpa a prévia.
export function ImportarPlanilha() {
  const id = useId()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<ResultadoDaPlanilha | null>(null)
  const [enviando, iniciar] = useTransition()

  function enviar(acao: typeof preverPlanilha) {
    if (!arquivo) {
      setResultado({ ...VAZIO, erro: MENSAGENS.planilhaNenhuma })
      return
    }
    const dados = new FormData()
    dados.set("planilha", arquivo)
    iniciar(async () => {
      try {
        setResultado(await acao(VAZIO, dados))
      } catch {
        setResultado({ ...VAZIO, erro: MENSAGENS.acaoFalhou })
      }
    })
  }

  function conferir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    enviar(preverPlanilha)
  }

  function importar() {
    if (window.confirm("Importar a planilha? As mudanças vão para o catálogo.")) enviar(gravarPlanilha)
  }

  const nadaAImportar = resultado && resultado.resumo && !resultado.erros.length && !resultado.podeImportar && !resultado.erro

  return (
    <section aria-labelledby={`${id}-titulo`} className="vidro flex flex-col gap-4 rounded-3xl p-5">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold">
        Importar
      </h2>
      <form onSubmit={conferir} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-arquivo`}>Planilha (.xlsx)</Label>
          <Input
            id={`${id}-arquivo`}
            name="planilha"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(evento) => {
              setArquivo(evento.target.files?.[0] ?? null)
              setResultado(null)
            }}
          />
          <p className="text-xs text-muted-foreground">Primeiro a prévia: nada é gravado até você importar.</p>
        </div>
        <Button type="submit" variant="outline" disabled={enviando}>
          {enviando ? "Conferindo…" : "Conferir planilha"}
        </Button>
      </form>

      {resultado ? (
        <div className="flex flex-col gap-3">
          <MensagemDeErro>{resultado.erro}</MensagemDeErro>
          {resultado.resumo ? <p className="font-medium">{resultado.resumo}</p> : null}
          {nadaAImportar ? <p className="text-sm text-muted-foreground">{MENSAGENS.nadaAImportar}</p> : null}
          {resultado.erros.length ? (
            <div className="tabela-vidro overflow-x-auto">
              <table aria-label="Erros da planilha" className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Aba</th>
                    <th className="px-3 py-2 font-medium">Linha</th>
                    <th className="px-3 py-2 font-medium">Coluna</th>
                    <th className="px-3 py-2 font-medium">Problema</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.erros.map((erro, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{erro.aba ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{erro.linha ?? "—"}</td>
                      <td className="px-3 py-2">{erro.coluna ?? "—"}</td>
                      <td className="px-3 py-2">{erro.mensagem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {resultado.podeImportar ? (
            <Button type="button" className="self-start" disabled={enviando} onClick={importar}>
              {enviando ? "Importando…" : "Importar planilha"}
            </Button>
          ) : null}
          <MensagemDeSucesso>{resultado.sucesso}</MensagemDeSucesso>
        </div>
      ) : null}
    </section>
  )
}
