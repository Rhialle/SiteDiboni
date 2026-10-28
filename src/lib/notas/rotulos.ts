import type { Selo } from "@/components/ui/selo"
import type { Database } from "@/lib/supabase/tipos"

type Situacao = Database["public"]["Enums"]["situacao_nota"]
type Tom = NonNullable<Parameters<typeof Selo>[0]["tom"]>

// Nomes que aparecem na tela para a situação da nota, e a cor do selo de cada uma.
export const ROTULO_SITUACAO_NOTA: Record<Situacao, string> = {
  em_revisao: "Em revisão",
  aguardando_administrador: "Aguardando administrador",
  confirmada: "Confirmada",
  descartada: "Descartada",
}

export const TOM_SITUACAO_NOTA: Record<Situacao, Tom> = {
  em_revisao: "atencao",
  aguardando_administrador: "marca",
  confirmada: "ok",
  descartada: "neutro",
}
