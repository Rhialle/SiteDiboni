import { exigirAdministrador } from "@/lib/auth/sessao"
import { diaEmSaoPaulo } from "@/lib/formatacao"
import { paraCatalogoAtual } from "@/lib/planilha/catalogo"
import { escreverPlanilha } from "@/lib/planilha/escrever"
import { arquivoXlsx } from "@/lib/planilha/resposta"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// O catálogo atual no mesmo modelo, para editar e importar de volta.
export async function GET() {
  await exigirAdministrador()
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc("catalogo_para_planilha")
  if (error) throw error
  const catalogo = paraCatalogoAtual(data)
  return arquivoXlsx(await escreverPlanilha(catalogo.variacoes, catalogo.formas), `catalogo-${diaEmSaoPaulo()}.xlsx`)
}
