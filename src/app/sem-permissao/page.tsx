import Link from "next/link"

import { TelaDeAcesso } from "@/components/tela-de-acesso"
import { MENSAGENS } from "@/lib/auth/mensagens"

export default function PaginaSemPermissao() {
  return (
    <TelaDeAcesso titulo="Acesso restrito">
      <div className="flex flex-col gap-4 text-sm">
        <p role="alert">{MENSAGENS.semPermissao}</p>
        <Link href="/inicio" className="text-muted-foreground underline-offset-4 hover:underline">
          Voltar ao Início
        </Link>
      </div>
    </TelaDeAcesso>
  )
}
