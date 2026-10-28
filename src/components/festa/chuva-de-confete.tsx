"use client"

import { motion, useReducedMotion } from "motion/react"
import { useEffect, useId, useState } from "react"

import { CORES_DA_FESTA, DegradesDaFesta, Forma, type CorDaFesta, type TipoDeForma } from "./formas"

type Particula = {
  id: number
  tipo: TipoDeForma
  cor: CorDaFesta
  largura: number
  dx: number
  dy: number
  giro: number
  duracao: number
}

const TIPOS: TipoDeForma[] = ["esfera", "pilula", "triangulo", "brilho"]

function sortear(quantidade: number): Particula[] {
  const entre = (a: number, b: number) => a + Math.random() * (b - a)
  return Array.from({ length: quantidade }, (_, id) => {
    const tipo = TIPOS[id % TIPOS.length]
    const angulo = entre(-Math.PI * 0.95, -Math.PI * 0.05)
    const forca = entre(140, 340)
    return {
      id,
      tipo,
      cor: CORES_DA_FESTA[Math.floor(Math.random() * CORES_DA_FESTA.length)],
      largura: tipo === "pilula" ? entre(18, 26) : entre(10, 16),
      dx: Math.cos(angulo) * forca,
      dy: Math.sin(angulo) * forca,
      giro: entre(-540, 540),
      duracao: entre(1.5, 2.3),
    }
  })
}

// Confete com as formas do fundo de festa, saindo de um ponto (o balão) quando aparece.
// Com `umaVezPorSessao`, comemora só na primeira vez que a pessoa vê a tela desde que abriu o navegador.
export function ChuvaDeConfete({ origem, umaVezPorSessao }: { origem: { x: number; y: number }; umaVezPorSessao?: string }) {
  const prefixo = useId()
  const reduzir = useReducedMotion()
  const [particulas, setParticulas] = useState<Particula[]>([])

  useEffect(() => {
    if (reduzir) return
    // Sorteado só no navegador, para o servidor e a primeira pintura não divergirem.
    const sorteio = setTimeout(() => {
      if (umaVezPorSessao) {
        try {
          if (sessionStorage.getItem(umaVezPorSessao)) return
          sessionStorage.setItem(umaVezPorSessao, "1")
        } catch {
          // Sem armazenamento (janela anônima, por exemplo): comemora mesmo assim.
        }
      }
      setParticulas(sortear(42))
    }, 300)
    return () => clearTimeout(sorteio)
  }, [reduzir, umaVezPorSessao])

  if (particulas.length === 0) return null
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      <DegradesDaFesta prefixo={prefixo} />
      {particulas.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{ left: origem.x, top: origem.y, width: p.largura, marginLeft: -p.largura / 2, marginTop: -p.largura / 2 }}
          initial={{ x: 0, y: 0, scale: 0.3, rotate: 0, opacity: 1 }}
          animate={{
            x: [0, p.dx, p.dx * 1.25],
            y: [0, p.dy, p.dy + 260],
            scale: [0.3, 1, 0.9],
            rotate: [0, p.giro / 2, p.giro],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: p.duracao, times: [0, 0.38, 1], ease: [0.2, 0.7, 0.35, 1] }}
          onAnimationComplete={() => setParticulas((lista) => lista.filter((outra) => outra.id !== p.id))}
        >
          <Forma tipo={p.tipo} cor={p.cor} prefixo={prefixo} />
        </motion.span>
      ))}
    </div>
  )
}
