import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { exigirUsuario } from "@/lib/auth/sessao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { AbrirCaixa } from "../caixa/formularios"
import { VendaNoNavegador } from "./venda-no-navegador"

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaBalcao() {
  return (
    <Suspense fallback={<MolduraDeFicha paineis={2} />}>
      <Balcao />
    </Suspense>
  )
}

async function Balcao() {
  const supabase = await criarClienteServidor()
  const [usuario, abertoR, configuracoesR] = await Promise.all([
    exigirUsuario(),
    supabase.rpc("caixa_aberto"),
    supabase.from("configuracoes").select("limite_desconto_percentual").eq("id", 1).single(),
  ])
  if (abertoR.error) throw abertoR.error
  if (configuracoesR.error) throw configuracoesR.error
  const aberto = abertoR.data?.[0]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold sm:text-4xl">Balcão</h1>
      {aberto ? (
        <VendaNoNavegador
          administrador={usuario.papel === "administrador"}
          limiteDescontoPercentual={configuracoesR.data.limite_desconto_percentual}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Para vender, abra o caixa do dia.</p>
          <AbrirCaixa />
        </>
      )}
    </div>
  )
}
