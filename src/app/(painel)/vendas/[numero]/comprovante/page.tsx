import { notFound } from "next/navigation"
import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { exigirUsuario } from "@/lib/auth/sessao"
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/balcao/rotulos"
import { formatarDataHora, formatarMoeda } from "@/lib/formatacao"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import { formatarCnpj } from "@/lib/validacao/cnpj"

import { BotaoImprimir } from "./botao-imprimir"

// Comprovante não fiscal no tamanho da impressora de cupom (80 ou 58 mm, em Configurações).
export default function PaginaComprovante({ params }: PageProps<"/vendas/[numero]/comprovante">) {
  return (
    <Suspense fallback={<MolduraDeFicha paineis={1} />}>
      <Comprovante params={params} />
    </Suspense>
  )
}

async function Comprovante({ params }: Pick<PageProps<"/vendas/[numero]/comprovante">, "params">) {
  const numero = Number((await params).numero)
  if (!Number.isSafeInteger(numero)) notFound()

  const supabase = await criarClienteServidor()
  const [, vendaR, configuracoesR] = await Promise.all([
    exigirUsuario(),
    supabase
      .from("vendas")
      .select(
        "numero, vendida_em, subtotal_centavos, desconto_centavos, total_centavos, situacao, venda_itens(id, quantidade, total_centavos, preco_unitario_centavos, formas_venda(nome, peso_variavel), variacoes(nome, produtos(nome))), venda_pagamentos(id, forma, valor_centavos, recebido_centavos, troco_centavos)",
      )
      .eq("numero", numero)
      .maybeSingle(),
    supabase.from("configuracoes").select("cnpj_loja, largura_cupom_mm").eq("id", 1).single(),
  ])
  if (vendaR.error || !vendaR.data) notFound()
  if (configuracoesR.error) throw configuracoesR.error
  const venda = vendaR.data
  const largura = configuracoesR.data.largura_cupom_mm
  const cnpj = configuracoesR.data.cnpj_loja

  return (
    <div className="flex flex-col gap-4">
      {/* Na impressão, só o cupom aparece, sem margens, na largura da impressora. */}
      <style>{`
        @page { size: ${largura}mm auto; margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          .cupom, .cupom * { visibility: visible !important; }
          .cupom { position: absolute; left: 0; top: 0; box-shadow: none !important; background: #fff !important; }
        }
      `}</style>
      <BotaoImprimir />
      <article
        aria-label="Comprovante"
        className="cupom bg-white p-3 font-mono text-[12px] leading-snug text-black"
        style={{ width: `${largura}mm` }}
      >
        <p className="text-center text-[14px] font-bold">Di Boni</p>
        {cnpj ? <p className="text-center">CNPJ {formatarCnpj(cnpj)}</p> : null}
        <p className="mt-2 text-center">Venda nº {venda.numero}</p>
        <p className="text-center">{formatarDataHora(venda.vendida_em)}</p>
        {venda.situacao === "cancelada" ? <p className="text-center font-bold">CANCELADA</p> : null}
        <hr className="my-2 border-dashed border-black" />
        {venda.venda_itens.map((item) => (
          <div key={item.id} className="mb-1">
            <p>
              {item.variacoes.produtos.nome} – {item.variacoes.nome}
            </p>
            <p className="flex justify-between gap-2">
              <span>
                {item.formas_venda.peso_variavel
                  ? `${item.quantidade} g × ${formatarMoeda(item.preco_unitario_centavos)}/kg`
                  : `${item.quantidade} × ${item.formas_venda.nome} ${formatarMoeda(item.preco_unitario_centavos)}`}
              </span>
              <span>{formatarMoeda(item.total_centavos)}</span>
            </p>
          </div>
        ))}
        <hr className="my-2 border-dashed border-black" />
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatarMoeda(venda.subtotal_centavos)}</span>
        </p>
        {venda.desconto_centavos > 0 ? (
          <p className="flex justify-between">
            <span>Desconto</span>
            <span>-{formatarMoeda(venda.desconto_centavos)}</span>
          </p>
        ) : null}
        <p className="flex justify-between text-[14px] font-bold">
          <span>Total</span>
          <span>{formatarMoeda(venda.total_centavos)}</span>
        </p>
        {venda.venda_pagamentos.map((p) => (
          <p key={p.id} className="flex justify-between">
            <span>{ROTULO_FORMA_PAGAMENTO[p.forma]}</span>
            <span>{formatarMoeda(p.recebido_centavos ?? p.valor_centavos)}</span>
          </p>
        ))}
        {venda.venda_pagamentos.some((p) => p.troco_centavos > 0) ? (
          <p className="flex justify-between">
            <span>Troco</span>
            <span>{formatarMoeda(venda.venda_pagamentos.reduce((s, p) => s + p.troco_centavos, 0))}</span>
          </p>
        ) : null}
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">Não é documento fiscal</p>
      </article>
    </div>
  )
}
