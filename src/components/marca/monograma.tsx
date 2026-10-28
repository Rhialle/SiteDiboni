"use client"

import { useId } from "react"

// O "db" do logo, redesenhado em vetor: "d" em degradê roxo-magenta, "b" azul-marinho com brilho azul na base.
// Cliente só por causa do useId: cada cópia precisa de ids próprios para os degradês, senão uma cópia
// escondida (menu do computador no celular, por exemplo) apaga as cores das outras.
const FORMA_D = "M415 205 L530 180 L530 707.9 A322 175 0 0 1 415 372 Z M415 392 A245 157 0 0 0 415 662 Z"

export function Monograma({ className, rotulo }: { className?: string; rotulo?: string }) {
  const id = useId()
  return (
    <svg
      viewBox="205 170 670 550"
      className={className}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}d`} x1="0" y1="180" x2="0" y2="710" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a8288f" />
          <stop offset=".55" stopColor="#9a2690" />
          <stop offset="1" stopColor="#561450" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="180" x2="0" y2="710" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#121a55" />
          <stop offset=".86" stopColor="#111a53" />
          <stop offset="1" stopColor="#1b5a9c" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id}d)`} fillRule="evenodd" d={FORMA_D} />
      <path fill={`url(#${id}b)`} fillRule="evenodd" transform="matrix(-1 0 0 1 1078 0)" d={FORMA_D} />
    </svg>
  )
}

// Monograma num selo branco, como o círculo do logo, e o nome da loja ao lado.
export function MarcaDiBoni({ claro = false, compacta = false }: { claro?: boolean; compacta?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span
        className={`grid shrink-0 place-items-center rounded-full bg-white/95 shadow-[inset_0_1px_0_#fff,0_6px_16px_-6px_rgb(17_26_83/0.45)] ${compacta ? "size-10" : "size-12"}`}
      >
        <Monograma className={compacta ? "h-[23px] w-7" : "h-7 w-[34px]"} />
      </span>
      <span
        className={`leading-none font-extrabold tracking-tight ${compacta ? "text-[1.375rem]" : "text-[1.625rem]"} ${claro ? "text-white" : "text-tinta"}`}
      >
        Di Boni
      </span>
    </span>
  )
}
