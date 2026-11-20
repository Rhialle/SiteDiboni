import type { Metadata } from "next"
import Link from "next/link"

import { TelaDeAcesso } from "@/components/tela-de-acesso"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = { title: "Página não encontrada · Di Boni" }

// Fora do painel: um endereço que o site não tem. Mesma moldura das telas de acesso.
export default function NaoEncontrado() {
  return (
    <TelaDeAcesso titulo="Página não encontrada" descricao="Este endereço não existe no sistema da Di Boni.">
      <div className="flex flex-col gap-4 text-sm">
        <p role="alert">Confira se o endereço foi digitado certo, ou volte para o começo.</p>
        <Link href="/inicio" className={buttonVariants()}>
          Voltar ao Início
        </Link>
      </div>
    </TelaDeAcesso>
  )
}
