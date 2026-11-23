"use client"

import { Button } from "@/components/ui/button"

export function BotaoImprimir() {
  return (
    <Button className="w-fit print:hidden" onClick={() => window.print()}>
      Imprimir
    </Button>
  )
}
