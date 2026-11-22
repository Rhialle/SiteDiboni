"use client"

import dynamic from "next/dynamic"

import { Carregando, Barra } from "@/components/painel/moldura"

// A venda em andamento fica guardada no navegador: a tela de venda só é desenhada nele, para a
// venda guardada voltar já no primeiro desenho (sem piscar vazia).
export const VendaNoNavegador = dynamic(() => import("./venda").then((m) => m.Venda), {
  ssr: false,
  loading: () => (
    <Carregando className="flex flex-col gap-3">
      <Barra className="h-12 w-full max-w-xl" />
      <Barra className="h-40 w-full" />
    </Carregando>
  ),
})
