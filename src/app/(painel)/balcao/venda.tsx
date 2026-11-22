"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  adicionar,
  descontoEmCentavos,
  paraEnvio,
  subtotal,
  totalDaLinha,
  troco,
  type Desconto,
  type FormaDaLinha,
  type FormaPagamento,
  type LinhaDoCarrinho,
  type Pagamento,
} from "@/lib/balcao/carrinho"
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/balcao/rotulos"
import { precoUnitario } from "@/lib/catalogo/preco"
import { formatarMoeda, reaisParaCentavos } from "@/lib/formatacao"
import { MENSAGENS, mensagemDescontoAcimaDoLimite } from "@/lib/mensagens"

import { buscarParaVenda, concluirVenda, type ItemParaVenda } from "./acoes"

// A venda em andamento fica no navegador deste computador: volta depois de recarregar a página ou de
// trocar de login (o administrador entra para dar um desconto acima do limite).
const CHAVE = "diboni:venda-em-andamento"

type Opcao = FormaDaLinha & { id: string }
type Variacao = {
  nome: string
  opcoes: Opcao[]
  disponivel: number
  soVencido: boolean
  controlaValidade: boolean
  tipoVenda: "unidade" | "peso"
}
type Guardada = { linhas: LinhaDoCarrinho[]; variacoes: Record<string, Variacao>; desconto: Desconto; conferidas: string[] }

const VAZIA: Guardada = { linhas: [], variacoes: {}, desconto: { tipo: "reais", valor: 0 }, conferidas: [] }

function lerGuardada(): Guardada {
  try {
    const texto = window.localStorage.getItem(CHAVE)
    return texto ? { ...VAZIA, ...(JSON.parse(texto) as Guardada) } : VAZIA
  } catch {
    return VAZIA
  }
}

function guardar(venda: Guardada) {
  try {
    if (venda.linhas.length === 0) window.localStorage.removeItem(CHAVE)
    else window.localStorage.setItem(CHAVE, JSON.stringify(venda))
  } catch {
    // Navegador sem armazenamento: a venda só não volta depois de recarregar.
  }
}

function paraVariacao(item: ItemParaVenda): Variacao {
  const formas = (item.formas ?? []) as {
    id: string
    nome: string
    fator: number
    preco_centavos: number
    peso_variavel: boolean
    faixas: { quantidade_minima: number; preco_centavos: number }[]
  }[]
  return {
    nome: `${item.produto} – ${item.variacao}`,
    opcoes: formas.map((f) => ({
      id: f.id,
      nome: f.nome,
      fator: f.fator,
      preco_centavos: f.preco_centavos,
      pesoVariavel: f.peso_variavel,
      faixas: f.faixas,
    })),
    disponivel: Number(item.disponivel),
    soVencido: item.so_vencido,
    controlaValidade: item.controla_validade,
    tipoVenda: item.tipo_venda,
  }
}

// O código bipado ou digitado bate com o código da variação (de barras ou interno): entra direto.
function codigoExato(termo: string, item: ItemParaVenda): boolean {
  return /^\d{8,14}$/.test(termo) || item.codigo_interno.toUpperCase() === termo.trim().toUpperCase()
}

export function Venda({ administrador, limiteDescontoPercentual }: { administrador: boolean; limiteDescontoPercentual: number }) {
  const id = useId()
  const campo = useRef<HTMLInputElement>(null)
  // Só roda no navegador (venda-no-navegador.tsx): a venda guardada já entra no primeiro desenho.
  const [venda, setVenda] = useState<Guardada>(lerGuardada)
  const [termo, setTermo] = useState("")
  const [resultados, setResultados] = useState<ItemParaVenda[]>([])
  const [erro, setErro] = useState("")
  const [recebendo, setRecebendo] = useState(false)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [concluida, setConcluida] = useState<{ numero: number; trocoCentavos: number } | null>(null)
  const [ocupado, iniciar] = useTransition()

  function mudar(nova: Guardada) {
    setVenda(nova)
    guardar(nova)
  }

  const sub = subtotal(venda.linhas)
  const desconto = descontoEmCentavos(sub, venda.desconto)
  const total = sub - desconto
  const limiteCentavos = Math.round((sub * limiteDescontoPercentual) / 100)
  const descontoAcima = !administrador && desconto > limiteCentavos

  // Quanto da variação a venda pede, na unidade base, somando as linhas dela.
  function pedido(variacaoId: string): number {
    return venda.linhas
      .filter((l) => l.variacaoId === variacaoId)
      .reduce((soma, l) => soma + (l.forma.pesoVariavel ? l.quantidade : l.quantidade * l.forma.fator), 0)
  }

  function porNaVenda(item: ItemParaVenda, formaId?: string | null) {
    const variacao = paraVariacao(item)
    const opcao = variacao.opcoes.find((o) => o.id === formaId) ?? variacao.opcoes[0]
    if (!opcao) {
      setErro(MENSAGENS.semFormaDeVenda)
      return
    }
    const linha: LinhaDoCarrinho = {
      formaVendaId: opcao.id,
      variacaoId: item.variacao_id,
      nome: variacao.nome,
      forma: opcao,
      quantidade: opcao.pesoVariavel ? 0 : 1,
      validadeSemSaldo: null,
    }
    mudar({
      ...venda,
      linhas: opcao.pesoVariavel && venda.linhas.some((l) => l.formaVendaId === opcao.id) ? venda.linhas : adicionar(venda.linhas, linha),
      variacoes: { ...venda.variacoes, [item.variacao_id]: variacao },
    })
    setTermo("")
    setResultados([])
    campo.current?.focus()
  }

  function procurar() {
    const texto = termo.trim()
    if (!texto) return
    setErro("")
    iniciar(async () => {
      const resposta = await buscarParaVenda(texto)
      if ("erro" in resposta) return setErro(resposta.erro)
      const itens = resposta.itens
      if (itens.length === 0) return setErro(MENSAGENS.nadaEncontradoNoBalcao)
      if (itens.length === 1 && (itens[0].forma_exata || codigoExato(texto, itens[0]))) return porNaVenda(itens[0], itens[0].forma_exata)
      setResultados(itens)
    })
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter") {
      evento.preventDefault()
      procurar()
    }
  }

  function trocarLinha(indice: number, mudanca: Partial<LinhaDoCarrinho>) {
    mudar({ ...venda, linhas: venda.linhas.map((l, i) => (i === indice ? { ...l, ...mudanca } : l)) })
  }

  function abrirPagamento() {
    if (venda.linhas.length === 0 || descontoAcima) return
    setPagamentos([{ forma: "dinheiro", valorCentavos: total, recebidoCentavos: null }])
    setRecebendo(true)
    setErro("")
  }

  // Atalhos: F2 abre o pagamento; Esc fecha.
  useEffect(() => {
    function atalho(evento: globalThis.KeyboardEvent) {
      if (evento.key === "F2") {
        evento.preventDefault()
        abrirPagamento()
      } else if (evento.key === "Escape") {
        setRecebendo(false)
        campo.current?.focus()
      }
    }
    window.addEventListener("keydown", atalho)
    return () => window.removeEventListener("keydown", atalho)
  })

  const pendentes = venda.linhas.some((l) => l.quantidade <= 0)
  const vencidosSemConferir = Object.entries(venda.variacoes).some(
    ([variacaoId, v]) => v.soVencido && !venda.conferidas.includes(variacaoId) && venda.linhas.some((l) => l.variacaoId === variacaoId),
  )
  const somaPagamentos = pagamentos.reduce((soma, p) => soma + p.valorCentavos, 0)
  const trocoTotal = pagamentos.reduce(
    (soma, p) => soma + (p.forma === "dinheiro" && p.recebidoCentavos !== null ? troco(p.valorCentavos, p.recebidoCentavos) : 0),
    0,
  )

  function concluir() {
    setErro("")
    iniciar(async () => {
      const resposta = await concluirVenda(paraEnvio(venda.linhas, desconto, pagamentos))
      if ("erro" in resposta) return setErro(resposta.erro)
      mudar(VAZIA)
      setRecebendo(false)
      setConcluida(resposta)
      campo.current?.focus()
    })
  }

  function descartar() {
    if (!window.confirm("Descartar a venda em andamento?")) return
    mudar(VAZIA)
    setRecebendo(false)
    campo.current?.focus()
  }

  return (
    <div className="flex flex-col gap-5">
      {concluida ? (
        <section aria-label="Venda concluída" role="status" className="vidro flex flex-wrap items-center gap-4 rounded-3xl p-4">
          <p className="text-lg font-semibold">Venda nº {concluida.numero}</p>
          {concluida.trocoCentavos > 0 ? <p className="text-lg">Troco {formatarMoeda(concluida.trocoCentavos)}</p> : null}
          <Link href={`/vendas/${concluida.numero}/comprovante`} target="_blank" className="link-pilula">
            Imprimir comprovante
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setConcluida(null)}>
            Fechar aviso
          </Button>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-busca`}>Código ou nome</Label>
        <Input
          ref={campo}
          id={`${id}-busca`}
          value={termo}
          autoFocus
          autoComplete="off"
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={aoTeclar}
          placeholder="Bipe o código de barras ou digite o nome"
          className="h-12 max-w-xl text-lg"
        />
        <MensagemDeErro>{erro}</MensagemDeErro>
        {resultados.length > 0 ? (
          <ul aria-label="Resultados da busca" className="vidro flex max-w-xl flex-col rounded-2xl p-2 text-sm">
            {resultados.map((item) => (
              <li key={item.variacao_id}>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/60 focus:bg-white/60"
                  onClick={() => porNaVenda(item)}
                >
                  {item.produto} – {item.variacao} <span className="font-mono text-xs text-muted-foreground">{item.codigo_interno}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <section aria-label="Itens da venda" className="vidro flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
        {venda.linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item na venda.</p>
        ) : (
          venda.linhas.map((linha, indice) => {
            const variacao = venda.variacoes[linha.variacaoId]
            const semSaldo = variacao ? pedido(linha.variacaoId) > variacao.disponivel : false
            const unitario = linha.forma.pesoVariavel ? linha.forma.preco_centavos : precoUnitario(linha.forma, linha.quantidade)
            return (
              <div key={linha.formaVendaId} role="group" aria-label={linha.nome} className="flex flex-col gap-2 border-b border-tinta/10 pb-3 last:border-0">
                <div className="flex flex-wrap items-end gap-3">
                  <p className="min-w-48 flex-1 font-medium">{linha.nome}</p>
                  {variacao && variacao.opcoes.length > 1 ? (
                    <label className="flex flex-col gap-1 text-sm">
                      Forma
                      <select
                        className="campo-escolha"
                        value={linha.formaVendaId}
                        onChange={(e) => {
                          const opcao = variacao.opcoes.find((o) => o.id === e.target.value)
                          if (opcao) trocarLinha(indice, { formaVendaId: opcao.id, forma: opcao })
                        }}
                      >
                        {variacao.opcoes.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className="text-sm text-muted-foreground">{linha.forma.nome}</span>
                  )}
                  <label className="flex flex-col gap-1 text-sm">
                    {linha.forma.pesoVariavel ? "Gramas" : "Quantidade"}
                    <Input
                      inputMode="numeric"
                      value={linha.quantidade || ""}
                      onChange={(e) => trocarLinha(indice, { quantidade: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                      className="w-24"
                    />
                  </label>
                  <p className="w-32 text-sm tabular-nums">
                    {formatarMoeda(unitario)}
                    {linha.forma.pesoVariavel ? " o kg" : ""}
                  </p>
                  <p className="w-28 text-right font-semibold tabular-nums">{formatarMoeda(totalDaLinha(linha))}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Tirar ${linha.nome}`}
                    onClick={() => mudar({ ...venda, linhas: venda.linhas.filter((_, i) => i !== indice) })}
                  >
                    ×
                  </Button>
                </div>
                {variacao?.soVencido ? (
                  <label className="flex items-center gap-2 text-sm font-medium text-[#6e4d00]">
                    <input
                      type="checkbox"
                      checked={venda.conferidas.includes(linha.variacaoId)}
                      onChange={(e) =>
                        mudar({
                          ...venda,
                          conferidas: e.target.checked
                            ? [...venda.conferidas, linha.variacaoId]
                            : venda.conferidas.filter((v) => v !== linha.variacaoId),
                        })
                      }
                    />
                    {MENSAGENS.balcaoSoVencido} Conferi.
                  </label>
                ) : semSaldo ? (
                  <p className="text-sm font-medium text-[#6e4d00]">{MENSAGENS.balcaoSemSaldo}</p>
                ) : null}
                {semSaldo && variacao?.controlaValidade ? (
                  <label className="flex items-center gap-2 text-sm">
                    Validade da embalagem
                    <Input
                      type="date"
                      value={linha.validadeSemSaldo ?? ""}
                      onChange={(e) => trocarLinha(indice, { validadeSemSaldo: e.target.value || null })}
                      className="w-44"
                    />
                  </label>
                ) : null}
              </div>
            )
          })
        )}
      </section>

      <section aria-label="Total" className="vidro flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Desconto
            <Input
              key={venda.desconto.tipo}
              inputMode="decimal"
              defaultValue={
                venda.desconto.valor
                  ? String(venda.desconto.tipo === "reais" ? venda.desconto.valor / 100 : venda.desconto.valor).replace(".", ",")
                  : ""
              }
              onChange={(e) => {
                const texto = e.target.value.trim()
                let valor = 0
                if (texto) {
                  try {
                    valor = venda.desconto.tipo === "reais" ? reaisParaCentavos(texto) : Number(texto.replace(",", ".")) || 0
                  } catch {
                    valor = 0
                  }
                }
                mudar({ ...venda, desconto: { ...venda.desconto, valor } })
              }}
              className="w-28"
            />
          </label>
          <label className="flex flex-col gap-1">
            Em
            <select
              className="campo-escolha"
              value={venda.desconto.tipo}
              onChange={(e) => mudar({ ...venda, desconto: { tipo: e.target.value as Desconto["tipo"], valor: 0 } })}
            >
              <option value="reais">R$</option>
              <option value="percentual">%</option>
            </select>
          </label>
          <p className="ml-auto text-right">
            Subtotal {formatarMoeda(sub)}
            {desconto ? ` · desconto ${formatarMoeda(desconto)}` : ""}
          </p>
        </div>
        {descontoAcima ? <MensagemDeErro>{mensagemDescontoAcimaDoLimite(limiteDescontoPercentual)}</MensagemDeErro> : null}
        <p className="text-right text-4xl font-extrabold tabular-nums" aria-label="Total da venda">
          {formatarMoeda(total)}
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={descartar} disabled={venda.linhas.length === 0}>
            Descartar venda
          </Button>
          <Button onClick={abrirPagamento} disabled={venda.linhas.length === 0 || pendentes || descontoAcima || vencidosSemConferir}>
            Receber (F2)
          </Button>
        </div>
      </section>

      {recebendo ? (
        <section aria-label="Pagamento" className="vidro flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
          <h2 className="text-xl font-semibold">Pagamento de {formatarMoeda(total)}</h2>
          {pagamentos.map((p, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3 text-sm">
              <label className="flex flex-col gap-1">
                Forma de pagamento
                <select
                  className="campo-escolha"
                  value={p.forma}
                  onChange={(e) =>
                    setPagamentos(pagamentos.map((x, j) => (j === i ? { ...x, forma: e.target.value as FormaPagamento, recebidoCentavos: null } : x)))
                  }
                >
                  {Object.entries(ROTULO_FORMA_PAGAMENTO).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Valor
                <Input
                  inputMode="decimal"
                  defaultValue={(p.valorCentavos / 100).toFixed(2).replace(".", ",")}
                  onChange={(e) => {
                    let valor = 0
                    try {
                      valor = reaisParaCentavos(e.target.value)
                    } catch {
                      valor = 0
                    }
                    setPagamentos(pagamentos.map((x, j) => (j === i ? { ...x, valorCentavos: valor } : x)))
                  }}
                  className="w-28"
                />
              </label>
              {p.forma === "dinheiro" ? (
                <label className="flex flex-col gap-1">
                  Recebido
                  <Input
                    inputMode="decimal"
                    onChange={(e) => {
                      let recebido: number | null = null
                      try {
                        recebido = e.target.value.trim() ? reaisParaCentavos(e.target.value) : null
                      } catch {
                        recebido = null
                      }
                      setPagamentos(pagamentos.map((x, j) => (j === i ? { ...x, recebidoCentavos: recebido } : x)))
                    }}
                    className="w-28"
                  />
                </label>
              ) : null}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagamentos([...pagamentos, { forma: "pix", valorCentavos: Math.max(total - somaPagamentos, 0), recebidoCentavos: null }])}
            >
              Dividir o pagamento
            </Button>
            {somaPagamentos !== total ? (
              <p className="text-sm text-muted-foreground">Falta {formatarMoeda(total - somaPagamentos)}</p>
            ) : null}
            {trocoTotal > 0 ? <p className="text-2xl font-bold">Troco {formatarMoeda(trocoTotal)}</p> : null}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRecebendo(false)}>
              Voltar (Esc)
            </Button>
            <Button onClick={concluir} disabled={ocupado || somaPagamentos !== total}>
              Concluir venda
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
