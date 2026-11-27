"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react"

import { LeitorDeCodigo } from "@/components/leitor/leitor-de-codigo"
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
  totalDevolvido,
  troco,
  valorDevolvido,
  type Desconto,
  type FormaDaLinha,
  type FormaPagamento,
  type LinhaDevolvida,
  type LinhaDoCarrinho,
  type Pagamento,
} from "@/lib/balcao/carrinho"
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/balcao/rotulos"
import { precoUnitario } from "@/lib/catalogo/preco"
import { formatarMoeda, reaisParaCentavos } from "@/lib/formatacao"
import { MENSAGENS, mensagemDescontoAcimaDoLimite, mensagemFaltaParaTroca } from "@/lib/mensagens"

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
// A chave identifica a venda: se a internet cair na resposta e a pessoa concluir de novo, o banco
// devolve a venda já gravada em vez de gravar outra.
type Guardada = {
  chave: string
  linhas: LinhaDoCarrinho[]
  variacoes: Record<string, Variacao>
  desconto: Desconto
  conferidas: string[]
  // Troca (fase 2.4): o que o cliente devolve abate o pagamento.
  trocando: boolean
  devolvidos: LinhaDevolvida[]
}

function novaVenda(): Guardada {
  return {
    chave: crypto.randomUUID(),
    linhas: [],
    variacoes: {},
    desconto: { tipo: "reais", valor: 0 },
    conferidas: [],
    trocando: false,
    devolvidos: [],
  }
}

function lerGuardada(): Guardada {
  try {
    const texto = window.localStorage.getItem(CHAVE)
    return texto ? { ...novaVenda(), ...(JSON.parse(texto) as Partial<Guardada>) } : novaVenda()
  } catch {
    return novaVenda()
  }
}

function guardar(venda: Guardada) {
  try {
    if (venda.linhas.length === 0 && venda.devolvidos.length === 0 && !venda.trocando) window.localStorage.removeItem(CHAVE)
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
  const campoDevolvido = useRef<HTMLInputElement>(null)
  // Só roda no navegador (venda-no-navegador.tsx): a venda guardada já entra no primeiro desenho.
  const [venda, setVenda] = useState<Guardada>(lerGuardada)
  const [termo, setTermo] = useState("")
  const [resultados, setResultados] = useState<ItemParaVenda[]>([])
  const [termoDevolvido, setTermoDevolvido] = useState("")
  const [resultadosDevolvido, setResultadosDevolvido] = useState<ItemParaVenda[]>([])
  const [erro, setErro] = useState("")
  const [recebendo, setRecebendo] = useState(false)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [concluida, setConcluida] = useState<{ numero: number; trocoCentavos: number } | null>(null)
  const [ocupado, iniciar] = useTransition()

  // Mexer na venda (itens, devolvido, desconto) com o pagamento aberto fecha o pagamento: os valores
  // dele seriam os de antes. Receber de novo monta o pagamento com o novo valor a pagar.
  function mudar(nova: Guardada) {
    setVenda(nova)
    guardar(nova)
    setRecebendo(false)
  }

  const sub = subtotal(venda.linhas)
  const desconto = descontoEmCentavos(sub, venda.desconto)
  const total = sub - desconto
  const limiteCentavos = Math.round((sub * limiteDescontoPercentual) / 100)
  const descontoAcima = !administrador && desconto > limiteCentavos
  const devolvido = totalDevolvido(venda.devolvidos)
  // O que o cliente paga: o total menos o devolvido. Negativo: o devolvido vale mais (T4).
  const aPagar = total - devolvido

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
    // Pela forma de função: duas bipadas seguidas, com respostas fora de ordem, entram as duas.
    setVenda((atual) => {
      const nova = {
        ...atual,
        linhas:
          opcao.pesoVariavel && atual.linhas.some((l) => l.formaVendaId === opcao.id)
            ? atual.linhas
            : adicionar(atual.linhas, linha),
        variacoes: { ...atual.variacoes, [item.variacao_id]: variacao },
      }
      guardar(nova)
      return nova
    })
    setRecebendo(false)
    setResultados([])
    campo.current?.focus()
  }

  // O devolvido da mesma variação conta como saldo (ele entra antes das saídas).
  function devolvidoBase(variacaoId: string): number {
    return venda.devolvidos
      .filter((d) => d.variacaoId === variacaoId)
      .reduce((soma, d) => soma + (d.forma.pesoVariavel ? d.quantidade : d.quantidade * d.forma.fator), 0)
  }

  function porNoDevolvido(item: ItemParaVenda, formaId?: string | null) {
    const variacao = paraVariacao(item)
    const opcao = variacao.opcoes.find((o) => o.id === formaId) ?? variacao.opcoes[0]
    if (!opcao) {
      setErro(MENSAGENS.semFormaDeVenda)
      return
    }
    const quantidade = opcao.pesoVariavel ? 0 : 1
    setVenda((atual) => {
      const existente = atual.devolvidos.find((d) => d.formaVendaId === opcao.id)
      const devolvidos = existente
        ? opcao.pesoVariavel
          ? atual.devolvidos
          : atual.devolvidos.map((d) => (d === existente ? { ...d, quantidade: d.quantidade + 1 } : d))
        : [
            ...atual.devolvidos,
            { formaVendaId: opcao.id, variacaoId: item.variacao_id, nome: variacao.nome, forma: opcao, quantidade, validade: null },
          ]
      const nova = { ...atual, devolvidos, variacoes: { ...atual.variacoes, [item.variacao_id]: variacao } }
      guardar(nova)
      return nova
    })
    setRecebendo(false)
    setResultadosDevolvido([])
    campoDevolvido.current?.focus()
  }

  function procurarDevolvido(lido?: string) {
    const texto = (lido ?? termoDevolvido).trim()
    if (!texto) return
    setTermoDevolvido("")
    setErro("")
    iniciar(async () => {
      const resposta = await buscarParaVenda(texto, true)
      if ("erro" in resposta) return setErro(resposta.erro)
      const itens = resposta.itens
      if (itens.length === 0) return setErro(MENSAGENS.nadaEncontradoNoBalcao)
      if (itens.length === 1 && (itens[0].forma_exata || codigoExato(texto, itens[0]))) return porNoDevolvido(itens[0], itens[0].forma_exata)
      setResultadosDevolvido(itens)
    })
  }

  function trocarDevolvido(indice: number, mudanca: Partial<LinhaDevolvida>) {
    mudar({ ...venda, devolvidos: venda.devolvidos.map((d, i) => (i === indice ? { ...d, ...mudanca } : d)) })
  }

  function abrirTroca() {
    mudar({ ...venda, trocando: true })
    setTimeout(() => campoDevolvido.current?.focus(), 0)
  }

  function desfazerTroca() {
    mudar({ ...venda, trocando: false, devolvidos: [] })
    setResultadosDevolvido([])
    campo.current?.focus()
  }

  function procurar(lido?: string) {
    const texto = (lido ?? termo).trim()
    if (!texto) return
    // O campo se limpa na hora: a próxima bipada não se junta a esta, mesmo antes da resposta.
    setTermo("")
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
    if (venda.linhas.length === 0 || descontoAcima || aPagar < 0) return
    // Troca sem diferença: nada a pagar, conclui sem pagamento.
    setPagamentos(aPagar === 0 ? [] : [{ forma: "dinheiro", valorCentavos: aPagar, recebidoCentavos: null }])
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

  const pendentes = venda.linhas.some((l) => l.quantidade <= 0) || venda.devolvidos.some((d) => d.quantidade <= 0)
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
      let resposta: Awaited<ReturnType<typeof concluirVenda>>
      try {
        resposta = await concluirVenda({ ...paraEnvio(venda.linhas, desconto, pagamentos, venda.devolvidos), p_chave: venda.chave })
      } catch {
        // A venda continua guardada com a mesma chave: concluir de novo não grava em dobro.
        return setErro(MENSAGENS.balcaoSemConexao)
      }
      if ("erro" in resposta) return setErro(resposta.erro)
      mudar(novaVenda())
      setRecebendo(false)
      setConcluida(resposta)
      campo.current?.focus()
    })
  }

  function descartar() {
    if (!window.confirm("Descartar a venda em andamento?")) return
    mudar(novaVenda())
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
        {/* Reserva do leitor USB: o código lido entra como se tivesse sido bipado. */}
        <div className="flex flex-wrap gap-2">
          <LeitorDeCodigo aoLer={(codigo) => procurar(codigo)} aoFechar={() => campo.current?.focus()} />
          {venda.trocando ? null : (
            <Button type="button" variant="outline" onClick={abrirTroca}>
              Troca
            </Button>
          )}
        </div>
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
            const semSaldo = variacao ? pedido(linha.variacaoId) > variacao.disponivel + devolvidoBase(linha.variacaoId) : false
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

      {venda.trocando ? (
        <section aria-label="Devolvido" className="vidro flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold">Devolvido na troca</h2>
            <Button variant="ghost" size="sm" onClick={desfazerTroca}>
              Desfazer troca
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-devolvido`}>Devolvido: código ou nome</Label>
            <Input
              ref={campoDevolvido}
              id={`${id}-devolvido`}
              value={termoDevolvido}
              autoComplete="off"
              onChange={(e) => setTermoDevolvido(e.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault()
                  procurarDevolvido()
                }
              }}
              placeholder="Bipe ou digite o que o cliente devolve"
              className="h-11 max-w-xl"
            />
            {/* A câmera da troca entrega o código ao devolvido, e não à venda. */}
            <div>
              <LeitorDeCodigo aoLer={(codigo) => procurarDevolvido(codigo)} aoFechar={() => campoDevolvido.current?.focus()} />
            </div>
            {resultadosDevolvido.length > 0 ? (
              <ul aria-label="Resultados do devolvido" className="vidro flex max-w-xl flex-col rounded-2xl p-2 text-sm">
                {resultadosDevolvido.map((item) => (
                  <li key={item.variacao_id}>
                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/60 focus:bg-white/60"
                      onClick={() => porNoDevolvido(item)}
                    >
                      {item.produto} – {item.variacao} <span className="font-mono text-xs text-muted-foreground">{item.codigo_interno}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {venda.devolvidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bipe o produto que o cliente devolve.</p>
          ) : (
            venda.devolvidos.map((linha, indice) => {
              const variacao = venda.variacoes[linha.variacaoId]
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
                            if (opcao) trocarDevolvido(indice, { formaVendaId: opcao.id, forma: opcao })
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
                        onChange={(e) => trocarDevolvido(indice, { quantidade: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                        className="w-24"
                      />
                    </label>
                    <p className="w-28 text-right font-semibold tabular-nums">{formatarMoeda(valorDevolvido(linha))}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Tirar ${linha.nome} do devolvido`}
                      onClick={() => mudar({ ...venda, devolvidos: venda.devolvidos.filter((_, i) => i !== indice) })}
                    >
                      ×
                    </Button>
                  </div>
                  {variacao?.controlaValidade && variacao.disponivel <= 0 ? (
                    <label className="flex items-center gap-2 text-sm">
                      Validade da embalagem
                      <Input
                        type="date"
                        value={linha.validade ?? ""}
                        onChange={(e) => trocarDevolvido(indice, { validade: e.target.value || null })}
                        className="w-44"
                      />
                    </label>
                  ) : null}
                </div>
              )
            })
          )}
        </section>
      ) : null}

      <section aria-label="Total" className="vidro flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Desconto
            <Input
              key={`${venda.chave}-${venda.desconto.tipo}`}
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
        {venda.trocando ? (
          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-sm">
              Devolvido na troca <span aria-label="Devolvido na troca" className="font-semibold tabular-nums">{formatarMoeda(devolvido)}</span>
            </p>
            <p className="text-lg">
              A pagar <span aria-label="A pagar" className="text-2xl font-bold tabular-nums">{formatarMoeda(Math.max(aPagar, 0))}</span>
            </p>
            {aPagar < 0 ? <MensagemDeErro>{mensagemFaltaParaTroca(-aPagar)}</MensagemDeErro> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={descartar} disabled={venda.linhas.length === 0 && venda.devolvidos.length === 0}>
            Descartar venda
          </Button>
          <Button
            onClick={abrirPagamento}
            disabled={venda.linhas.length === 0 || pendentes || descontoAcima || vencidosSemConferir || aPagar < 0}
          >
            Receber (F2)
          </Button>
        </div>
      </section>

      {recebendo ? (
        <section aria-label="Pagamento" className="vidro flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
          <h2 className="text-xl font-semibold">Pagamento de {formatarMoeda(aPagar)}</h2>
          {aPagar === 0 ? <p className="text-sm">Nada a pagar: o devolvido cobre a troca.</p> : null}
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
            {aPagar > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagamentos([...pagamentos, { forma: "pix", valorCentavos: Math.max(aPagar - somaPagamentos, 0), recebidoCentavos: null }])}
              >
                Dividir o pagamento
              </Button>
            ) : null}
            {somaPagamentos !== aPagar ? (
              <p className="text-sm text-muted-foreground">Falta {formatarMoeda(aPagar - somaPagamentos)}</p>
            ) : null}
            {trocoTotal > 0 ? <p className="text-2xl font-bold">Troco {formatarMoeda(trocoTotal)}</p> : null}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRecebendo(false)}>
              Voltar (Esc)
            </Button>
            <Button onClick={concluir} disabled={ocupado || somaPagamentos !== aPagar}>
              Concluir venda
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
