// Formas do confete em 3D: esfera, pílula, triângulo, brilho e anel, nas cores da Di Boni.
// Cada forma usa os degradês de <DegradesDaFesta> com o mesmo prefixo.

export type CorDaFesta = "magenta" | "uva" | "sol" | "azul" | "menta" | "coral"
export type TipoDeForma = "esfera" | "pilula" | "triangulo" | "brilho" | "anel"

export const CORES_DA_FESTA: CorDaFesta[] = ["magenta", "uva", "sol", "azul", "menta", "coral"]

// Claro, base e escuro de cada cor.
const PALETA: Record<CorDaFesta, [string, string, string]> = {
  magenta: ["#ec92d8", "#a62c93", "#5e1653"],
  uva: ["#b383ea", "#5b1f8e", "#2e0d4f"],
  sol: ["#ffeaa8", "#ffc83d", "#d9930f"],
  azul: ["#b8d4ff", "#4a8bef", "#1f4fae"],
  menta: ["#a3f2d1", "#1db37a", "#0c7650"],
  coral: ["#ffb6b9", "#f2545b", "#b5262d"],
}

export function DegradesDaFesta({ prefixo }: { prefixo: string }) {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        {CORES_DA_FESTA.map((cor) => {
          const [claro, base, escuro] = PALETA[cor]
          return [
            <radialGradient key={`e-${cor}`} id={`${prefixo}e-${cor}`} cx=".34" cy=".3" r=".78">
              <stop offset="0" stopColor={claro} />
              <stop offset=".5" stopColor={base} />
              <stop offset="1" stopColor={escuro} />
            </radialGradient>,
            <linearGradient key={`l-${cor}`} id={`${prefixo}l-${cor}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={claro} />
              <stop offset=".5" stopColor={base} />
              <stop offset="1" stopColor={escuro} />
            </linearGradient>,
          ]
        })}
      </defs>
    </svg>
  )
}

export function Forma({ tipo, cor, prefixo }: { tipo: TipoDeForma; cor: CorDaFesta; prefixo: string }) {
  const esfera = `url(#${prefixo}e-${cor})`
  const linear = `url(#${prefixo}l-${cor})`
  switch (tipo) {
    case "esfera":
      return (
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="50" fill={esfera} />
          <ellipse cx="33" cy="27" rx="15" ry="9" fill="#fff" opacity=".5" transform="rotate(-32 33 27)" />
        </svg>
      )
    case "pilula":
      return (
        <svg viewBox="0 0 200 70">
          <rect width="200" height="70" rx="35" fill={linear} />
          <rect x="22" y="11" width="104" height="11" rx="5.5" fill="#fff" opacity=".4" />
        </svg>
      )
    case "triangulo":
      return (
        <svg viewBox="0 0 100 92">
          <path d="M43 9 Q50 -3 57 9 L96 79 Q102 90 89 90 L11 90 Q-2 90 4 79 Z" fill={linear} />
          <path d="M40 24 L50 8" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".45" />
        </svg>
      )
    case "brilho":
      return (
        <svg viewBox="0 0 100 100">
          <path d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z" fill={linear} />
        </svg>
      )
    case "anel":
      return (
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="39" fill="none" stroke={linear} strokeWidth="20" />
          <path d="M24 30 A34 34 0 0 1 44 16" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".45" />
        </svg>
      )
  }
}
