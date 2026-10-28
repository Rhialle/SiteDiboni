"use client"

import { cn } from "cn"
import { MotionConfig, motion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { MarcaDiBoni } from "@/components/marca/monograma"

import { ICONES, estaAtivo, type ItemDoMenu } from "./navegacao"

// Menu do computador: coluna de vidro violeta. A pílula branca desliza até a página aberta.
export function MenuLateral({ itens, pessoa }: { itens: ItemDoMenu[]; pessoa: ReactNode }) {
  const caminho = usePathname()
  const principais = itens.filter((item) => item.grupo === "principal")
  const administracao = itens.filter((item) => item.grupo === "administracao")

  return (
    <MotionConfig reducedMotion="user">
      <aside className="vidro-uva sticky top-0 z-20 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-white/20 px-3.5 pt-6 pb-5 md:flex">
        <Link href="/inicio" className="mb-7 self-start rounded-full px-1.5">
          <MarcaDiBoni claro />
        </Link>
        <nav aria-label="Menu" className="flex flex-col gap-1">
          {principais.map((item) => (
            <ItemDoMenuLateral key={item.href} item={item} ativo={estaAtivo(caminho, item.href)} />
          ))}
          {administracao.length > 0 ? (
            <>
              <div role="separator" className="mx-2.5 my-3 h-px bg-white/20" />
              {administracao.map((item) => (
                <ItemDoMenuLateral key={item.href} item={item} ativo={estaAtivo(caminho, item.href)} />
              ))}
            </>
          ) : null}
        </nav>
        <div className="mt-auto border-t border-white/20 pt-4">{pessoa}</div>
      </aside>
    </MotionConfig>
  )
}

function ItemDoMenuLateral({ item, ativo }: { item: ItemDoMenu; ativo: boolean }) {
  const Icone = ICONES[item.icone]
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "item-menu relative flex min-h-11 items-center gap-3 rounded-full px-4 text-[0.9375rem] transition-colors duration-200",
        ativo ? "font-semibold text-tinta" : "font-medium text-white/80 hover:bg-white/10 hover:text-white",
      )}
    >
      {ativo ? (
        <motion.span
          layoutId="pilula-do-menu"
          className="absolute inset-0 rounded-full bg-white/95 shadow-[inset_0_1px_0_#fff,0_10px_22px_-10px_rgb(17_10_60/0.7)]"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      ) : null}
      <Icone className="relative size-5" aria-hidden="true" />
      <span className="relative">{item.rotulo}</span>
    </Link>
  )
}
