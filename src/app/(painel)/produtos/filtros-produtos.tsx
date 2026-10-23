import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Formulário GET: a busca fica na URL, então dá para voltar e compartilhar o resultado.
export function FiltrosProdutos({ termo }: { termo: string }) {
  return (
    <form method="get" action="/produtos" className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="busca-produtos">Buscar</Label>
        <Input
          id="busca-produtos"
          name="q"
          defaultValue={termo}
          placeholder="Nome, código interno ou de barras"
          className="w-72"
        />
      </div>
      <Button type="submit" variant="outline">
        Buscar
      </Button>
    </form>
  )
}
