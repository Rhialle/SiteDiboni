"use client"

import { motion } from "motion/react"
import { useState } from "react"

import { ChuvaDeConfete } from "@/components/festa/chuva-de-confete"
import { Balao } from "@/components/marca/balao"

// Sem avisos, o balão comemora: chove confete uma vez por sessão, e de novo a cada clique no balão.
export function TudoEmDia({ mensagem }: { mensagem: string }) {
  const [rodada, setRodada] = useState(0)

  return (
    <div className="vidro relative flex items-center gap-5 rounded-[30px] px-6 py-6 sm:gap-7 sm:px-9">
      <ChuvaDeConfete origem={{ x: 72, y: 64 }} umaVezPorSessao="diboni:confete-tudo-em-dia" rodada={rodada} atraso={rodada ? 0 : 300} />
      <motion.button
        type="button"
        aria-label="Comemorar de novo"
        title="Comemorar de novo"
        onClick={() => setRodada((n) => n + 1)}
        whileHover={{ scale: 1.08, rotate: -4 }}
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
        className="shrink-0 rounded-full"
      >
        <Balao className="boia w-[72px] sm:w-24" />
      </motion.button>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-3xl font-extrabold sm:text-4xl">Tudo em dia!</h3>
        <p className="text-tinta-suave">{mensagem}</p>
      </div>
    </div>
  )
}
