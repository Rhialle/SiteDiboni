"use client"

import { useId, useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TIPOS_DE_FOTO, problemaDaFoto } from "@/lib/catalogo/fotos"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteNavegador } from "@/lib/supabase/navegador"

import { apagarFoto, moverFoto, registrarFoto, type EstadoFicha } from "./acoes"

const EXTENSAO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

export function Fotos({
  produtoId,
  nomeProduto,
  fotos,
  podeEditar,
}: {
  produtoId: string
  nomeProduto: string
  fotos: { id: string; url: string }[]
  podeEditar: boolean
}) {
  const id = useId()
  const [erro, setErro] = useState("")
  const [executando, iniciar] = useTransition()

  const executar = (fazer: () => Promise<EstadoFicha>) => {
    setErro("")
    iniciar(async () => setErro((await fazer()).erro))
  }

  // Vai direto do navegador para o Storage; se o banco recusar a linha, o arquivo é apagado.
  async function enviar(arquivo: File) {
    const problema = problemaDaFoto(arquivo)
    if (problema) {
      setErro(problema)
      return
    }
    const caminho = `${produtoId}/${crypto.randomUUID()}.${EXTENSAO[arquivo.type]}`
    const supabase = criarClienteNavegador()
    const { error } = await supabase.storage
      .from("fotos-produtos")
      .upload(caminho, arquivo, { contentType: arquivo.type })
    if (error) {
      setErro(MENSAGENS.acaoFalhou)
      return
    }
    const resultado = await registrarFoto(produtoId, caminho)
    if (resultado.erro) {
      await supabase.storage.from("fotos-produtos").remove([caminho])
      setErro(resultado.erro)
      return
    }
    setErro("")
  }

  return (
    <div className="flex flex-col gap-3">
      {fotos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma foto.</p> : null}
      <ul aria-label="Fotos" className="flex flex-wrap gap-3">
        {fotos.map((foto, i) => (
          <li key={foto.id} className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- fotos do Storage, sem otimização da Vercel */}
            <img src={foto.url} alt={`Foto ${i + 1} de ${nomeProduto}`} className="size-32 rounded-lg border object-cover" />
            {podeEditar ? (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" aria-label={`Mover foto ${i + 1} para antes`} disabled={executando || i === 0}
                  onClick={() => executar(() => moverFoto(produtoId, foto.id, "antes"))}>
                  ←
                </Button>
                <Button variant="ghost" size="sm" aria-label={`Apagar foto ${i + 1}`} disabled={executando}
                  onClick={() => executar(() => apagarFoto(produtoId, foto.id))}>
                  Apagar
                </Button>
                <Button variant="ghost" size="sm" aria-label={`Mover foto ${i + 1} para depois`} disabled={executando || i === fotos.length - 1}
                  onClick={() => executar(() => moverFoto(produtoId, foto.id, "depois"))}>
                  →
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {podeEditar ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-foto`}>Adicionar foto</Label>
          <input
            id={`${id}-foto`}
            type="file"
            accept={TIPOS_DE_FOTO.join(",")}
            disabled={executando}
            className="text-sm"
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0]
              evento.target.value = ""
              if (arquivo) iniciar(() => enviar(arquivo))
            }}
          />
          <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 5 MB. No máximo 8 fotos.</p>
        </div>
      ) : null}
      <MensagemDeErro>{erro}</MensagemDeErro>
    </div>
  )
}
