"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, useTransition, type FormEvent } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MENSAGENS } from "@/lib/mensagens"
import { MAXIMO_ARQUIVOS, TAMANHO_MAXIMO_XML } from "@/lib/notas/limites"

import { importarXml, type ResultadoDoArquivo } from "./acoes"

// Lê cada arquivo no navegador e manda um de cada vez; um arquivo com erro não impede os outros.
export function ImportarNotas() {
  const id = useId()
  const router = useRouter()
  const [resultados, setResultados] = useState<ResultadoDoArquivo[]>([])
  const [erro, setErro] = useState("")
  const [importando, iniciar] = useTransition()

  function importar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const arquivos = [...(new FormData(formulario).getAll("arquivos") as File[])].filter((a) => a.size > 0)
    setErro("")
    setResultados([])
    if (arquivos.length === 0) {
      setErro(MENSAGENS.xmlNenhum)
      return
    }
    if (arquivos.length > MAXIMO_ARQUIVOS) {
      setErro(MENSAGENS.xmlDemais)
      return
    }
    iniciar(async () => {
      for (const arquivo of arquivos) {
        const falha = (erro: string): ResultadoDoArquivo => ({ arquivo: arquivo.name, erro, sucesso: "", notaId: null })
        let resultado: ResultadoDoArquivo
        if (arquivo.size > TAMANHO_MAXIMO_XML) {
          resultado = falha(MENSAGENS.xmlGrande)
        } else {
          try {
            resultado = await importarXml(arquivo.name, await arquivo.text())
          } catch {
            // Queda de conexão ou envio recusado: este arquivo falha, os próximos continuam.
            resultado = falha(MENSAGENS.acaoFalhou)
          }
        }
        setResultados((atuais) => [...atuais, resultado])
      }
      formulario.reset()
      router.refresh()
    })
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="vidro flex flex-col gap-3 rounded-3xl p-5">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold">
        Importar XML
      </h2>
      <form onSubmit={importar} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-arquivos`}>Arquivos XML</Label>
          <Input id={`${id}-arquivos`} name="arquivos" type="file" multiple accept=".xml,text/xml,application/xml" />
          <p className="text-xs text-muted-foreground">Até {MAXIMO_ARQUIVOS} arquivos de NF-e (até 4 MB cada).</p>
        </div>
        <Button type="submit" disabled={importando}>
          {importando ? "Importando…" : "Importar notas"}
        </Button>
      </form>
      <MensagemDeErro>{erro}</MensagemDeErro>
      {resultados.length > 0 ? (
        <ul aria-label="Resultado da importação" className="flex flex-col gap-1.5 text-sm">
          {resultados.map((r, i) => (
            <li key={`${r.arquivo}-${i}`} className={r.erro ? "text-destructive" : ""}>
              <span className="font-medium">{r.arquivo}</span>: {r.erro || r.sucesso}{" "}
              {r.notaId ? (
                <Link href={`/notas/${r.notaId}`} className="underline-offset-4 hover:underline">
                  Abrir a nota
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
