import { TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { FundoFesta } from "@/components/festa/fundo-festa"
import { Balao } from "@/components/marca/balao"
import { MarcaDiBoni } from "@/components/marca/monograma"

// Moldura das telas de entrar, duas etapas, recuperar e redefinir senha: fundo violeta com confete,
// cartão de vidro que chega com uma mola e o balão da Di Boni.
export function TelaDeAcesso({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao?: string
  children: ReactNode
}) {
  return (
    <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(120%_80%_at_15%_0%,#7a2bb8_0%,transparent_60%),linear-gradient(160deg,#3a1268_0%,#5b1f8e_45%,#a62c93_100%)] px-4 py-16">
      <FundoFesta cena="entrar" className="absolute -z-10" />
      <div className="relative w-full max-w-[400px]">
        <Balao className="boia absolute -top-28 right-2 w-[88px]" />
        <div className="vidro chega-com-mola flex flex-col gap-5 rounded-[32px] bg-white/80 px-6 pt-7 pb-6 sm:px-7">
          <MarcaDiBoni />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[2rem] leading-tight font-bold">{titulo}</h1>
            {descricao ? <p className="text-[0.9375rem] text-tinta-suave">{descricao}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}

// Erro treme ao aparecer, como um "não" balançando a cabeça.
export function MensagemDeErro({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="treme flex items-start gap-2 rounded-xl bg-[#ffe8e9] px-3 py-2 text-sm font-medium text-[#a3222b]">
      <TriangleAlert aria-hidden="true" className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
