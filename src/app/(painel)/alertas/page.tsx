import { ArrowDown, Clock, TriangleAlert, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { formatarDia } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

// Cada seção usa a cor da carta do Início: vencendo em sol, vencido em coral, repor em azul.
const ICONES_DAS_SECOES = {
  sol: Clock,
  coral: TriangleAlert,
  azul: ArrowDown,
} satisfies Record<string, LucideIcon>

function Secao({
  id,
  titulo,
  cor,
  vazio,
  children,
}: {
  id: string
  titulo: string
  cor: keyof typeof ICONES_DAS_SECOES
  vazio: boolean
  children: ReactNode
}) {
  const Icone = ICONES_DAS_SECOES[cor]
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={`icone-jogo icone-${cor} size-9 rounded-[11px]`}>
          <Icone className="size-[18px]" />
        </span>
        <h2 id={id} className="text-xl font-semibold">
          {titulo}
        </h2>
      </div>
      {vazio ? <p className="text-sm text-muted-foreground">Nada aqui.</p> : <div className="tabela-vidro overflow-x-auto">{children}</div>}
    </section>
  )
}

const CABECALHO = "bg-muted/50 text-muted-foreground"
const CELULA = "px-4 py-3"

export default async function PaginaAlertas() {
  await exigirUsuario()
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc("alertas_estoque")
  if (error) throw error

  const alertas = data ?? []
  const vencendo = alertas.filter((a) => a.tipo === "vencendo").sort((a, b) => a.dias_para_vencer - b.dias_para_vencer)
  const vencidos = alertas.filter((a) => a.tipo === "vencido").sort((a, b) => a.dias_para_vencer - b.dias_para_vencer)
  const abaixo = alertas.filter((a) => a.tipo === "abaixo_minimo").sort((a, b) => a.produto.localeCompare(b.produto))

  const produto = (a: (typeof alertas)[number]) => (
    <Link href={`/estoque/${a.variacao_id}`} className="font-medium hover:underline">
      {a.produto} — {a.variacao}
    </Link>
  )

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold sm:text-4xl">Alertas</h1>

      <Secao id="alertas-vencendo" titulo="Vencendo" cor="sol" vazio={vencendo.length === 0}>
        <table className="w-full text-left text-sm">
          <thead className={CABECALHO}>
            <tr>
              <th className={CELULA}>Produto</th>
              <th className={CELULA}>Lote</th>
              <th className={CELULA}>Validade</th>
              <th className={CELULA}>Vence</th>
              <th className={CELULA}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {vencendo.map((a) => (
              <tr key={a.lote_id} className="border-t">
                <td className={CELULA}>{produto(a)}</td>
                <td className={`${CELULA} font-mono text-xs`}>{a.lote}</td>
                <td className={CELULA}>{formatarDia(a.validade)}</td>
                <td className={CELULA}>
                  até {a.faixa_dias} dias ({a.dias_para_vencer === 0 ? "hoje" : `em ${a.dias_para_vencer} dia(s)`})
                </td>
                <td className={CELULA}>{formatarQuantidade(a.saldo, a.tipo_venda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao id="alertas-vencidos" titulo="Vencidos com saldo" cor="coral" vazio={vencidos.length === 0}>
        <table className="w-full text-left text-sm">
          <thead className={CABECALHO}>
            <tr>
              <th className={CELULA}>Produto</th>
              <th className={CELULA}>Lote</th>
              <th className={CELULA}>Validade</th>
              <th className={CELULA}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {vencidos.map((a) => (
              <tr key={a.lote_id} className="border-t">
                <td className={CELULA}>{produto(a)}</td>
                <td className={`${CELULA} font-mono text-xs`}>{a.lote}</td>
                <td className={CELULA}>{formatarDia(a.validade)}</td>
                <td className={CELULA}>{formatarQuantidade(a.saldo, a.tipo_venda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao id="alertas-minimo" titulo="Abaixo do estoque mínimo" cor="azul" vazio={abaixo.length === 0}>
        <table className="w-full text-left text-sm">
          <thead className={CABECALHO}>
            <tr>
              <th className={CELULA}>Produto</th>
              <th className={CELULA}>Disponível</th>
              <th className={CELULA}>Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {abaixo.map((a) => (
              <tr key={a.variacao_id} className="border-t">
                <td className={CELULA}>{produto(a)}</td>
                <td className={CELULA}>{formatarQuantidade(a.saldo, a.tipo_venda)}</td>
                <td className={CELULA}>{formatarQuantidade(a.estoque_minimo, a.tipo_venda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>
    </div>
  )
}
