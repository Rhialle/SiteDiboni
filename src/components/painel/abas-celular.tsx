"use client"

import { cn } from "cn"
import { LayoutGrid } from "lucide-react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

import { ICONES, estaAtivo, type ItemDoMenu } from "./navegacao"

const MOLA = { type: "spring", stiffness: 420, damping: 32 } as const

// Menu do celular: barra de vidro flutuante com os quatro itens principais; o resto fica em "Mais".
export function AbasCelular({ itens, rodapeDoMais }: { itens: ItemDoMenu[]; rodapeDoMais: ReactNode }) {
  const caminho = usePathname()
  const [aberto, setAberto] = useState(false)
  const principais = itens.filter((item) => item.grupo === "principal").slice(0, 4)
  const extras = itens.filter((item) => !principais.includes(item))
  const maisAtivo = aberto || extras.some((item) => estaAtivo(caminho, item.href))

  useEffect(() => {
    if (!aberto) return
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false)
    }
    window.addEventListener("keydown", fecharComEsc)
    return () => window.removeEventListener("keydown", fecharComEsc)
  }, [aberto])

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {aberto ? (
          <motion.div
            key="fundo"
            className="fixed inset-0 z-30 bg-tinta/20 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAberto(false)}
          />
        ) : null}
        {aberto ? (
          <motion.div
            key="painel"
            id="menu-mais"
            className="vidro fixed inset-x-3 bottom-[5.75rem] z-40 flex flex-col gap-3 rounded-[28px] p-3 md:hidden"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={MOLA}
          >
            {extras.length > 0 ? (
              <nav aria-label="Mais opções" className="flex flex-col gap-1">
                {extras.map((item) => {
                  const Icone = ICONES[item.icone]
                  const ativo = estaAtivo(caminho, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      onClick={() => setAberto(false)}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-2xl px-4 font-medium text-tinta",
                        ativo ? "bg-magenta/10 text-magenta" : "hover:bg-tinta/5",
                      )}
                    >
                      <Icone className="size-5" aria-hidden="true" />
                      {item.rotulo}
                    </Link>
                  )
                })}
              </nav>
            ) : null}
            {rodapeDoMais}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav
        aria-label="Menu"
        className="vidro fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[30px] p-2 md:hidden"
      >
        {principais.map((item) => {
          const Icone = ICONES[item.icone]
          const ativo = !aberto && estaAtivo(caminho, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "relative grid justify-items-center gap-0.5 rounded-[22px] py-1.5 text-xs transition-colors",
                ativo ? "font-semibold text-magenta" : "font-medium text-tinta-suave",
              )}
            >
              {ativo ? <motion.span layoutId="pilula-das-abas" className="absolute inset-0 rounded-[22px] bg-magenta/10" transition={MOLA} /> : null}
              <Icone className="relative size-[22px]" aria-hidden="true" />
              <span className="relative">{item.rotulo}</span>
            </Link>
          )
        })}
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls="menu-mais"
          onClick={() => setAberto((valor) => !valor)}
          className={cn(
            "relative grid justify-items-center gap-0.5 rounded-[22px] py-1.5 text-xs transition-colors",
            maisAtivo ? "font-semibold text-magenta" : "font-medium text-tinta-suave",
          )}
        >
          {maisAtivo ? <motion.span layoutId="pilula-das-abas" className="absolute inset-0 rounded-[22px] bg-magenta/10" transition={MOLA} /> : null}
          <LayoutGrid className="relative size-[22px]" aria-hidden="true" />
          <span className="relative">Mais</span>
        </button>
      </nav>
    </MotionConfig>
  )
}
