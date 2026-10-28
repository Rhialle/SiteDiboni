"use client"

import { useEffect } from "react"

// Efeitos que valem para o site inteiro, num lugar só:
// - faíscas coloridas saindo de cada clique em botão, link ou caixa de marcar;
// - luz que segue o cursor dentro do vidro (--luz-x, --luz-y);
// - cartas com data-inclina que inclinam na direção do cursor (--rx, --ry);
// - fundo de festa que acompanha o mouse (--px, --py na raiz).
// Quem pede menos movimento no computador não vê nada disso.

const CORES = ["#a62c93", "#ffc83d", "#4a8bef", "#1db37a", "#f2545b", "#c13fa6"]
const CLICAVEIS = 'button, a, [role="button"], summary, label, input[type="checkbox"], input[type="radio"], select'
const DURACAO_FAISCA = 460

type Faisca = { x: number; y: number; angulo: number; alcance: number; cor: string; inicio: number }

export function EfeitosGlobais() {
  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)")
    const raiz = document.documentElement

    const tela = document.createElement("canvas")
    tela.setAttribute("aria-hidden", "true")
    Object.assign(tela.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "70" })
    document.body.appendChild(tela)
    const pincel = tela.getContext("2d")
    let faiscas: Faisca[] = []
    let quadro = 0

    const ajustarTela = () => {
      const escala = window.devicePixelRatio || 1
      tela.width = window.innerWidth * escala
      tela.height = window.innerHeight * escala
      pincel?.setTransform(escala, 0, 0, escala, 0, 0)
    }
    ajustarTela()

    const desenhar = (agora: number) => {
      if (!pincel) return
      pincel.clearRect(0, 0, window.innerWidth, window.innerHeight)
      faiscas = faiscas.filter((f) => agora - f.inicio < DURACAO_FAISCA)
      for (const f of faiscas) {
        const t = Math.max(0, (agora - f.inicio) / DURACAO_FAISCA)
        const distancia = (1 - Math.pow(1 - t, 3)) * f.alcance
        const comprimento = 10 * (1 - t)
        const x = f.x + Math.cos(f.angulo) * distancia
        const y = f.y + Math.sin(f.angulo) * distancia
        pincel.globalAlpha = 1 - t * 0.7
        pincel.strokeStyle = f.cor
        pincel.lineWidth = 2.6
        pincel.lineCap = "round"
        pincel.beginPath()
        pincel.moveTo(x, y)
        pincel.lineTo(x + Math.cos(f.angulo) * comprimento, y + Math.sin(f.angulo) * comprimento)
        pincel.stroke()
      }
      pincel.globalAlpha = 1
      quadro = faiscas.length > 0 ? requestAnimationFrame(desenhar) : 0
    }

    const aoApertar = (evento: PointerEvent) => {
      if (reduzir.matches || evento.button !== 0 || !(evento.target instanceof Element)) return
      const alvo = evento.target.closest(CLICAVEIS)
      if (!alvo || alvo.matches(":disabled")) return
      const agora = performance.now()
      const giro = Math.random() * Math.PI
      for (let i = 0; i < 9; i++) {
        faiscas.push({
          x: evento.clientX,
          y: evento.clientY,
          angulo: giro + (i / 9) * Math.PI * 2,
          alcance: 24 + Math.random() * 16,
          cor: CORES[i % CORES.length],
          inicio: agora,
        })
      }
      if (!quadro) quadro = requestAnimationFrame(desenhar)
    }

    let ultimo: PointerEvent | null = null
    let agendado = false
    let inclinada: HTMLElement | null = null

    const aplicarMovimento = () => {
      agendado = false
      const evento = ultimo
      if (!evento) return
      raiz.style.setProperty("--px", ((evento.clientX / window.innerWidth) * 2 - 1).toFixed(3))
      raiz.style.setProperty("--py", ((evento.clientY / window.innerHeight) * 2 - 1).toFixed(3))
      const elemento = evento.target instanceof Element ? evento.target : null

      const vidro = elemento?.closest<HTMLElement>(".vidro, .tabela-vidro")
      if (vidro) {
        const caixa = vidro.getBoundingClientRect()
        vidro.style.setProperty("--luz-x", `${evento.clientX - caixa.left}px`)
        vidro.style.setProperty("--luz-y", `${evento.clientY - caixa.top}px`)
      }

      const carta = elemento?.closest<HTMLElement>("[data-inclina]") ?? null
      if (inclinada && inclinada !== carta) {
        inclinada.style.removeProperty("--rx")
        inclinada.style.removeProperty("--ry")
      }
      if (carta) {
        const caixa = carta.getBoundingClientRect()
        const dx = (evento.clientX - caixa.left) / caixa.width - 0.5
        const dy = (evento.clientY - caixa.top) / caixa.height - 0.5
        carta.style.setProperty("--rx", `${(-dy * 10).toFixed(2)}deg`)
        carta.style.setProperty("--ry", `${(dx * 12).toFixed(2)}deg`)
      }
      inclinada = carta
    }

    const aoMover = (evento: PointerEvent) => {
      if (reduzir.matches || evento.pointerType !== "mouse") return
      ultimo = evento
      if (!agendado) {
        agendado = true
        requestAnimationFrame(aplicarMovimento)
      }
    }

    window.addEventListener("pointerdown", aoApertar, { passive: true })
    window.addEventListener("pointermove", aoMover, { passive: true })
    window.addEventListener("resize", ajustarTela)
    return () => {
      window.removeEventListener("pointerdown", aoApertar)
      window.removeEventListener("pointermove", aoMover)
      window.removeEventListener("resize", ajustarTela)
      cancelAnimationFrame(quadro)
      tela.remove()
    }
  }, [])

  return null
}
