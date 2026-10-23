import { exigirAdministrador } from "@/lib/auth/sessao"
import { formatarMoeda, formatarReais } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import { formatarCnpj } from "@/lib/validacao/cnpj"
import { formatarDiasDeAlerta } from "@/lib/validacao/dias-alerta"

import { FormularioConfiguracoes } from "./formulario-configuracoes"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaConfiguracoes() {
  await exigirAdministrador()

  const supabase = await criarClienteServidor()
  const { data: configuracoes, error } = await supabase
    .from("configuracoes")
    .select("cnpj_loja, limite_ajuste_centavos, dias_alerta_validade")
    .eq("id", 1)
    .single()
  if (error) throw error

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados da loja e regras do estoque.</p>
      </div>
      <FormularioConfiguracoes
        salvos={{
          cnpj: configuracoes.cnpj_loja ? formatarCnpj(configuracoes.cnpj_loja) : "",
          limite: formatarReais(configuracoes.limite_ajuste_centavos),
          dias: formatarDiasDeAlerta(configuracoes.dias_alerta_validade),
        }}
        limiteAtual={formatarMoeda(configuracoes.limite_ajuste_centavos)}
      />
    </div>
  )
}
