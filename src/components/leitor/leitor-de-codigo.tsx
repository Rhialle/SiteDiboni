"use client"

import { Camera } from "lucide-react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { FORMATOS_LIDOS, limparCodigoLido } from "@/lib/leitor/codigo"
import { MENSAGENS } from "@/lib/mensagens"

const nadaMuda = () => () => {}

type Detector = { detect: (fonte: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

// O leitor só é baixado quando alguém toca em Câmera; o arquivo do iPhone (WebAssembly) vem do
// próprio site (public/leitor/, copiado no npm install), e não de outro endereço.
async function criarDetector(): Promise<Detector> {
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill")
  prepareZXingModule({
    overrides: {
      locateFile: (caminho: string, prefixo: string) =>
        caminho.endsWith(".wasm") ? "/leitor/zxing_reader.wasm" : prefixo + caminho,
    },
  })
  return new BarcodeDetector({ formats: [...FORMATOS_LIDOS] })
}

// Botão Câmera: abre a câmera traseira por cima da tela, lê o código de barras e entrega o código.
// Nada é gravado nem enviado: a leitura acontece no próprio aparelho, e a câmera desliga ao ler,
// ao fechar e ao sair da tela.
export function LeitorDeCodigo({ aoLer }: { aoLer: (codigo: string) => void }) {
  // No servidor não há câmera: o botão aparece depois de a página chegar ao navegador.
  const temCamera = useSyncExternalStore(
    nadaMuda,
    () => Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  )
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState("")
  const video = useRef<HTMLVideoElement>(null)
  const fluxo = useRef<MediaStream | null>(null)
  const ativo = useRef(false)

  function desligar() {
    ativo.current = false
    fluxo.current?.getTracks().forEach((trilha) => trilha.stop())
    fluxo.current = null
  }

  function fechar() {
    desligar()
    setAberto(false)
  }

  // Ao sair da tela com a câmera aberta, ela desliga.
  useEffect(() => desligar, [])

  async function abrir() {
    setErro("")
    setAberto(true)
    try {
      const [detector, camera] = await Promise.all([
        criarDetector(),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }),
      ])
      fluxo.current = camera
      ativo.current = true
      if (!video.current) return desligar()
      video.current.srcObject = camera
      await video.current.play()
      // Lê umas 6 vezes por segundo até achar um código.
      while (ativo.current && video.current) {
        const achados = await detector.detect(video.current).catch(() => [])
        const codigo = achados.map((a) => limparCodigoLido(a.rawValue)).find(Boolean)
        if (codigo && ativo.current) {
          navigator.vibrate?.(80)
          fechar()
          aoLer(codigo)
          return
        }
        await new Promise((r) => setTimeout(r, 160))
      }
    } catch (e) {
      desligar()
      const nome = e instanceof DOMException ? e.name : ""
      setErro(nome === "NotFoundError" || nome === "OverconstrainedError" ? MENSAGENS.semCamera : MENSAGENS.cameraBloqueada)
    }
  }

  if (!temCamera) return null
  return (
    <>
      <Button type="button" variant="outline" onClick={abrir} className="gap-2">
        <Camera className="size-4" aria-hidden="true" />
        Câmera
      </Button>
      {aberto ? (
        <div role="dialog" aria-modal="true" aria-label="Ler código de barras" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-black">
            <video ref={video} playsInline muted className="aspect-[3/4] w-full object-cover" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-2xl border-4 border-white/80" />
          </div>
          <p className="text-center text-sm text-white">Mire no código de barras.</p>
          <MensagemDeErro>{erro}</MensagemDeErro>
          <Button type="button" variant="secondary" onClick={fechar}>
            Fechar
          </Button>
        </div>
      ) : null}
    </>
  )
}
