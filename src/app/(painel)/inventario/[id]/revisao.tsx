"use client"

import { useState, useTransition } from "react"

import { MensagemDeSucesso } from "@/components/mensagem-de-sucesso"
import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { MENSAGENS } from "@/lib/mensagens"

import { aprovarInventario, cancelarInventario, encerrarContagem, reabrirContagem, type ResultadoDoInventario } from "./acoes"

type Acao = (inventarioId: number) => Promise<ResultadoDoInventario>

// Os botões do administrador: encerrar (em contagem), aprovar e voltar a contar (em revisão) e cancelar
// (nos dois). Fica sempre na página, para a mensagem continuar à vista quando a situação muda.
export function AcoesDoInventario({
  inventarioId,
  situacao,
}: {
  inventarioId: number
  situacao: "aberto" | "em_revisao" | "aprovado" | "cancelado"
}) {
  const [resultado, setResultado] = useState<ResultadoDoInventario>({ erro: "", sucesso: "" })
  const [enviando, iniciar] = useTransition()

  function executar(acao: Acao, pergunta: string) {
    if (!window.confirm(pergunta)) return
    setResultado({ erro: "", sucesso: "" })
    iniciar(async () => {
      try {
        setResultado(await acao(inventarioId))
      } catch {
        setResultado({ erro: MENSAGENS.acaoFalhou, sucesso: "" })
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {situacao === "aberto" ? (
          <Button type="button" disabled={enviando} onClick={() => executar(encerrarContagem, "Encerrar a contagem e revisar as diferenças?")}>
            Encerrar contagem
          </Button>
        ) : null}
        {situacao === "em_revisao" ? (
          <>
            <Button
              type="button"
              disabled={enviando}
              onClick={() => executar(aprovarInventario, "Aprovar o inventário? O estoque recebe os ajustes.")}
            >
              Aprovar inventário
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={enviando}
              onClick={() => executar(reabrirContagem, "Voltar a contar? As contagens feitas continuam.")}
            >
              Voltar a contar
            </Button>
          </>
        ) : null}
        {situacao === "aberto" || situacao === "em_revisao" ? (
          <Button
            type="button"
            variant="outline"
            disabled={enviando}
            onClick={() => executar(cancelarInventario, "Cancelar o inventário? Nada muda no estoque.")}
          >
            Cancelar inventário
          </Button>
        ) : null}
      </div>
      <MensagemDeErro>{resultado.erro}</MensagemDeErro>
      <MensagemDeSucesso>{resultado.sucesso}</MensagemDeSucesso>
    </div>
  )
}
