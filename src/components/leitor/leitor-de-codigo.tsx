"use client"

import { Camera } from "lucide-react"
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { FORMATOS_LIDOS, limparCodigoLido } from "@/lib/leitor/codigo"
import { MENSAGENS } from "@/lib/mensagens"

const nadaMuda = () => () => {}

type Detector = { detect: (fonte: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

// As opções ficam fixas: o leitor compara as opções a cada carregamento, e opções novas o fariam
// baixar e preparar o arquivo de novo a cada abertura da câmera.
const OPCOES_DO_LEITOR = {
  overrides: {
    locateFile: (caminho: string, prefixo: string) =>
      caminho.endsWith(".wasm") ? "/leitor/zxing_reader.wasm" : prefixo + caminho,
  },
  fireImmediately: true as const,
}

let leitorPronto: Promise<Detector> | null = null

// O leitor só é baixado quando alguém toca em Câmera; o arquivo do leitor (WebAssembly) vem do
// próprio site (public/leitor/, copiado no npm install), e não de outro endereço. Depois de pronto,
// fica guardado para as próximas leituras; se falhar (sem internet), a próxima tentativa baixa de novo.
function criarDetector(): Promise<Detector> {
  leitorPronto ??= (async () => {
    const leitor = await import("barcode-detector/ponyfill")
    try {
      await leitor.prepareZXingModule(OPCOES_DO_LEITOR)
    } catch (erro) {
      leitor.purgeZXingModule()
      throw erro
    }
    return new leitor.BarcodeDetector({ formats: [...FORMATOS_LIDOS] })
  })().catch((erro: unknown) => {
    leitorPronto = null
    throw erro
  })
  return leitorPronto
}

function pararCamera(camera: MediaStream) {
  camera.getTracks().forEach((trilha) => trilha.stop())
}

function mensagemDaCamera(erro: unknown): string {
  const nome = (erro as { name?: string } | null)?.name
  if (nome === "NotAllowedError" || nome === "SecurityError") return MENSAGENS.cameraBloqueada
  if (nome === "NotFoundError" || nome === "OverconstrainedError") return MENSAGENS.semCamera
  return MENSAGENS.cameraFalhou
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Botão Câmera: abre a câmera traseira por cima da tela, lê o código de barras e entrega o código.
// Nada é gravado nem enviado: a leitura acontece no próprio aparelho, e a câmera desliga ao ler,
// ao fechar e ao sair da tela. `aoFechar` roda sempre que a janela fecha (para devolver o cursor).
export function LeitorDeCodigo({ aoLer, aoFechar }: { aoLer: (codigo: string) => void; aoFechar?: () => void }) {
  // No servidor não há câmera: o botão aparece depois de a página chegar ao navegador.
  const temCamera = useSyncExternalStore(
    nadaMuda,
    () => Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  )
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState("")
  const video = useRef<HTMLVideoElement>(null)
  const botaoFechar = useRef<HTMLButtonElement>(null)
  const fluxo = useRef<MediaStream | null>(null)
  // Cada abertura tem um número; fechar, sair da tela ou abrir de novo troca o número, e uma abertura
  // antiga que termina depois desliga a própria câmera em vez de usá-la.
  const tentativa = useRef(0)

  function desligar() {
    tentativa.current += 1
    if (fluxo.current) pararCamera(fluxo.current)
    fluxo.current = null
  }

  function fechar() {
    desligar()
    setAberto(false)
    setErro("")
    aoFechar?.()
  }

  function falhar(mensagem: string) {
    desligar()
    setErro(mensagem)
  }

  // Ao sair da tela com a câmera aberta (ou abrindo), ela desliga.
  useEffect(() => desligar, [])

  // Com a janela aberta: Esc fecha (antes dos atalhos da tela de trás) e o Tab fica no Fechar.
  const aoTeclar = useEffectEvent((evento: KeyboardEvent) => {
    if (evento.key === "Escape") {
      evento.preventDefault()
      evento.stopPropagation()
      fechar()
    } else if (evento.key === "Tab") {
      evento.preventDefault()
      botaoFechar.current?.focus()
    }
  })
  useEffect(() => {
    if (!aberto) return
    const ouvir = (evento: KeyboardEvent) => aoTeclar(evento)
    window.addEventListener("keydown", ouvir, true)
    return () => window.removeEventListener("keydown", ouvir, true)
  }, [aberto])

  async function abrir() {
    desligar()
    const minha = tentativa.current
    const vigente = () => tentativa.current === minha
    setErro("")
    setAberto(true)
    const [leitor, camera] = await Promise.allSettled([
      criarDetector(),
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }),
    ])
    if (camera.status === "fulfilled" && (!vigente() || leitor.status === "rejected")) pararCamera(camera.value)
    if (!vigente()) return
    if (camera.status === "rejected") return falhar(mensagemDaCamera(camera.reason))
    if (leitor.status === "rejected") return falhar(MENSAGENS.leitorFalhou)
    fluxo.current = camera.value
    const tela = video.current
    if (!tela) return desligar()
    tela.srcObject = camera.value
    try {
      await tela.play()
    } catch {
      if (vigente()) falhar(MENSAGENS.cameraFalhou)
      return
    }
    // Lê umas 6 vezes por segundo até achar um código.
    while (vigente()) {
      let achados: { rawValue: string }[] = []
      try {
        achados = await leitor.value.detect(tela)
      } catch (e) {
        if ((e as { name?: string } | null)?.name === "NotSupportedError") {
          if (vigente()) falhar(MENSAGENS.leitorFalhou)
          return
        }
      }
      if (!vigente()) return
      const codigo = achados.map((a) => limparCodigoLido(a.rawValue)).find(Boolean)
      if (codigo) {
        navigator.vibrate?.(80)
        fechar()
        aoLer(codigo)
        return
      }
      await esperar(160)
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
          <div className={erro ? "hidden" : "contents"}>
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-black">
              <video ref={video} playsInline muted className="aspect-[3/4] w-full object-cover" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-2xl border-4 border-white/80" />
            </div>
            <p className="text-center text-sm text-white">Mire no código de barras.</p>
          </div>
          <MensagemDeErro>{erro}</MensagemDeErro>
          <Button ref={botaoFechar} type="button" variant="secondary" onClick={fechar} autoFocus>
            Fechar
          </Button>
        </div>
      ) : null}
    </>
  )
}
