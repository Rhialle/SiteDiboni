"use client"

import { cn } from "cn"
import { usePathname } from "next/navigation"
import { useId, type CSSProperties } from "react"

import { DegradesDaFesta, Forma, type CorDaFesta, type TipoDeForma } from "./formas"

// [forma, cor, posição x %, posição y %, largura máxima em px, giro inicial, segundos de cada ida]
type Peca = [TipoDeForma, CorDaFesta, number, number, number, number, number]

const CENAS = {
  // Telas de trabalho: formas só nos cantos, longe do conteúdo.
  painel: [
    ["esfera", "azul", 86, -12, 240, 0, 24],
    ["pilula", "magenta", -5, 86, 230, 18, 22],
    ["brilho", "sol", 58, 3, 40, 0, 14],
    ["anel", "menta", 95, 72, 120, 0, 26],
  ],
  // Início: a tela de festa, com mais confete.
  inicio: [
    ["esfera", "magenta", 84, -16, 260, 0, 22],
    ["anel", "uva", -4, 58, 190, 0, 24],
    ["pilula", "sol", 32, 86, 240, -22, 18],
    ["triangulo", "azul", 88, 60, 130, 14, 20],
    ["brilho", "sol", 54, 5, 46, 0, 12],
    ["esfera", "menta", 64, 88, 86, 0, 16],
    ["esfera", "coral", 2, 88, 80, 0, 19],
    ["brilho", "magenta", 95, 32, 34, 0, 13],
  ],
  entrar: [
    ["esfera", "sol", -10, 4, 130, 0, 18],
    ["pilula", "menta", 62, 84, 170, -24, 20],
    ["triangulo", "azul", 4, 76, 100, -10, 16],
    ["brilho", "sol", 80, 16, 44, 0, 12],
    ["esfera", "coral", 84, 58, 64, 0, 15],
    ["anel", "magenta", -12, 40, 120, 0, 24],
    ["brilho", "azul", 30, 92, 30, 0, 11],
  ],
} satisfies Record<string, Peca[]>

// Formas fixas atrás da tela. No painel, o Início ganha a cena de festa e só ele tem as formas flutuando.
export function FundoFesta({ cena, className }: { cena: "painel" | "entrar"; className?: string }) {
  const prefixo = useId()
  const caminho = usePathname()
  const naFesta = cena === "entrar" || caminho === "/inicio"
  const pecas: Peca[] = cena === "entrar" ? CENAS.entrar : naFesta ? CENAS.inicio : CENAS.painel

  return (
    <div aria-hidden="true" className={cn("pointer-events-none inset-0 overflow-hidden", className)}>
      <DegradesDaFesta prefixo={prefixo} />
      {pecas.map(([tipo, cor, x, y, largura, giro, duracao], i) => (
        <span
          key={`${tipo}-${i}`}
          className={cn("forma", naFesta && "forma-viva")}
          style={
            {
              left: `${x}%`,
              top: `${y}%`,
              width: `clamp(${Math.round(largura * 0.5)}px, ${(largura / 14).toFixed(1)}vw, ${largura}px)`,
              "--r": `${giro}deg`,
              "--d": `${duracao}s`,
              "--dx": `${((i * 37) % 44) - 22}px`,
              "--dy": `${((i * 53) % 44) - 26}px`,
              "--giro": `${((i * 29) % 28) - 14}deg`,
              animationDelay: `-${((i * 2.3) % duracao).toFixed(1)}s`,
            } as CSSProperties
          }
        >
          <Forma tipo={tipo} cor={cor} prefixo={prefixo} />
        </span>
      ))}
    </div>
  )
}
