import type { Selo } from "@/components/ui/selo"
import type { Database } from "@/lib/supabase/tipos"

type Situacao = Database["public"]["Enums"]["situacao_inventario"]
type Escopo = Database["public"]["Enums"]["escopo_inventario"]
type Tom = NonNullable<Parameters<typeof Selo>[0]["tom"]>

// Nomes que aparecem na tela para a situação e o escopo do inventário, e a cor do selo da situação.
export const ROTULO_SITUACAO_INVENTARIO: Record<Situacao, string> = {
  aberto: "Em contagem",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  cancelado: "Cancelado",
}

export const TOM_SITUACAO_INVENTARIO: Record<Situacao, Tom> = {
  aberto: "atencao",
  em_revisao: "marca",
  aprovado: "ok",
  cancelado: "neutro",
}

export const ROTULO_ESCOPO_INVENTARIO: Record<Escopo, string> = {
  loja: "Loja inteira",
  categorias: "Categorias",
  variacoes: "Variações",
}
