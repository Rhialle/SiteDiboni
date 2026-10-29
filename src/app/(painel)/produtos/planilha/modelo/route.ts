import { exigirAdministrador } from "@/lib/auth/sessao"
import { escreverPlanilha } from "@/lib/planilha/escrever"
import { arquivoXlsx } from "@/lib/planilha/resposta"

// O modelo vazio: só os cabeçalhos das duas abas.
export async function GET() {
  await exigirAdministrador()
  return arquivoXlsx(await escreverPlanilha([], []), "catalogo-modelo.xlsx")
}
