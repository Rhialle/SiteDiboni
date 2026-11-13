import { SearchX } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { MENSAGENS } from "@/lib/mensagens"

// Dentro do painel: um produto, uma nota ou um inventário que não existe (ou foi apagado).
// O menu continua ao lado; aqui a pessoa vê o que houve e para onde ir.
export default function NaoEncontradoNoPainel() {
  return (
    <div className="vidro flex max-w-xl flex-col items-start gap-4 rounded-3xl p-6 sm:p-8">
      <span aria-hidden="true" className="icone-jogo icone-sol size-12 rounded-[16px]">
        <SearchX className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Não encontramos isto</h1>
        <p role="alert" className="text-tinta-suave">
          {MENSAGENS.naoEncontrado}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/inicio" className={buttonVariants()}>
          Voltar ao Início
        </Link>
        <Link href="/produtos" className="link-pilula">
          Ver produtos
        </Link>
        <Link href="/estoque" className="link-pilula">
          Ver estoque
        </Link>
      </div>
    </div>
  )
}
