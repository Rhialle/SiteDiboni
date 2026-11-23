"use client"

import { useRouter } from "next/navigation"

import { LeitorDeCodigo } from "@/components/leitor/leitor-de-codigo"

// Na contagem, o código lido pela câmera vira a busca (o mesmo endereço ?q= da busca digitada).
export function CameraDaContagem() {
  const router = useRouter()
  return <LeitorDeCodigo aoLer={(codigo) => router.push(`?q=${encodeURIComponent(codigo)}`)} />
}
