import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import type { ReactNode } from "react"

// Selo de situação. Cada cor diz uma coisa só: coral é problema agora (e pulsa), sol é atenção,
// azul é repor, menta é tudo certo, magenta é pendente e neutro é informação.
const selo = cva(
  "estoura inline-flex w-fit items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-2 text-[0.8125rem] font-medium whitespace-nowrap before:size-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-['']",
  {
    variants: {
      tom: {
        critico: "selo-pulsa border-[#f7a3a7] bg-[#ffe8e9] text-[#a3222b]",
        atencao: "border-[#f3cf6b] bg-[#fff4d1] text-[#6e4d00]",
        repor: "border-[#a9c6fb] bg-[#e6efff] text-[#1f4fae]",
        ok: "border-[#8edcb9] bg-[#e0f7ec] text-[#0b6b47]",
        marca: "border-[#e3a6d6] bg-[#f8e6f4] text-[#7d1f6e]",
        neutro: "border-tinta/15 bg-white/70 text-tinta-suave",
      },
    },
    defaultVariants: { tom: "neutro" },
  },
)

export function Selo({
  tom,
  className,
  children,
}: VariantProps<typeof selo> & { className?: string; children: ReactNode }) {
  return <span className={cn(selo({ tom }), className)}>{children}</span>
}
