"use client"

import { animate, useReducedMotion } from "motion/react"
import { useEffect, useRef } from "react"

const formato = new Intl.NumberFormat("pt-BR")

// Número da carta de aviso: o servidor já manda o valor certo; no navegador ele conta de 0 até o valor.
export function NumeroAnimado({ valor, atraso = 0, className }: { valor: number; atraso?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduzir = useReducedMotion()

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || reduzir) return
    elemento.textContent = "0"
    const contagem = animate(0, valor, {
      duration: 0.9,
      delay: atraso,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (atual) => {
        elemento.textContent = formato.format(Math.round(atual))
      },
    })
    return () => {
      contagem.stop()
      elemento.textContent = formato.format(valor)
    }
  }, [valor, atraso, reduzir])

  return (
    <span ref={ref} className={className}>
      {formato.format(valor)}
    </span>
  )
}
