import { Button } from "@/components/ui/button"

import { entrarComoTeste } from "./acoes-teste"

// Só aparece com ENTRADA_DE_TESTE=1 (ver src/lib/auth/entrada-de-teste.ts).
export function EntradaDeTeste() {
  return (
    <section
      aria-labelledby="entrada-de-teste"
      className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-tinta/25 bg-[#fff6d6]/70 p-4 text-sm"
    >
      <h2 id="entrada-de-teste" className="font-medium">
        Modo de teste
      </h2>
      <p className="text-muted-foreground">Entra sem senha, numa conta de teste. Não use dados reais da loja.</p>
      <div className="flex flex-wrap gap-2">
        <form action={entrarComoTeste.bind(null, "administrador")}>
          <Button type="submit" variant="outline">
            Administrador de teste
          </Button>
        </form>
        <form action={entrarComoTeste.bind(null, "funcionario")}>
          <Button type="submit" variant="outline">
            Funcionária de teste
          </Button>
        </form>
      </div>
    </section>
  )
}
