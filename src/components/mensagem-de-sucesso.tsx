"use client"

import type { ReactNode } from "react"

import { ChuvaDeConfete } from "@/components/festa/chuva-de-confete"

// Aviso de "salvo": pílula escura de vidro que estoura com uma mola, solta uma chuvinha de confete
// e desenha o ✓.
export function MensagemDeSucesso({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className="relative w-fit">
      <p
        role="status"
        className="estoura inline-flex w-fit items-center gap-2.5 rounded-full bg-tinta/85 py-1.5 pr-4 pl-1.5 text-sm font-medium text-white shadow-[0_14px_30px_-14px_rgb(17_26_83/0.6)] backdrop-blur-xl"
      >
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-[linear-gradient(150deg,#7de8bd,var(--menta)_60%,#0c7650)]"
        >
          <svg viewBox="0 0 24 24" className="size-4">
            <path
              className="traco-check"
              pathLength={1}
              d="M5 12.5 10 17l9-10"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {children}
      </p>
      <ChuvaDeConfete origem={{ x: 20, y: 20 }} quantidade={16} forca={[40, 120]} queda={70} escala={0.75} atraso={180} />
    </div>
  )
}
