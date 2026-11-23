import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { exigirAdministrador } from "@/lib/auth/sessao"
import { formatarMoeda, formatarReais } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import { formatarCnpj } from "@/lib/validacao/cnpj"
import { formatarDiasDeAlerta } from "@/lib/validacao/dias-alerta"

import { FormularioConfiguracoes } from "./formulario-configuracoes"

const DESCRICAO = "Dados da loja e regras do estoque."

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaConfiguracoes() {
  return (
    <Suspense fallback={<MolduraDeFicha titulo="Configurações" descricao={DESCRICAO} estreito />}>
      <Configuracoes />
    </Suspense>
  )
}

async function Configuracoes() {
  const supabase = await criarClienteServidor()
  const [, { data: configuracoes, error }] = await Promise.all([
    exigirAdministrador(),
    supabase
      .from("configuracoes")
      .select("cnpj_loja, limite_ajuste_centavos, dias_alerta_validade, limite_desconto_percentual, largura_cupom_mm")
      .eq("id", 1)
      .single(),
  ])
  if (error) throw error

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">{DESCRICAO}</p>
      </div>
      <div className="vidro max-w-xl rounded-3xl p-5 sm:p-6">
        <FormularioConfiguracoes
          salvos={{
            cnpj: configuracoes.cnpj_loja ? formatarCnpj(configuracoes.cnpj_loja) : "",
            limite: formatarReais(configuracoes.limite_ajuste_centavos),
            dias: formatarDiasDeAlerta(configuracoes.dias_alerta_validade),
            desconto: String(configuracoes.limite_desconto_percentual),
            cupom: String(configuracoes.largura_cupom_mm),
          }}
          limiteAtual={formatarMoeda(configuracoes.limite_ajuste_centavos)}
        />
      </div>
    </div>
  )
}
