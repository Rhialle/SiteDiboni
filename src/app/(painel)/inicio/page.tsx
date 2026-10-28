import { ArrowDown, ClipboardCheck, Clock, TriangleAlert, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { CSSProperties } from "react"

import { ChuvaDeConfete } from "@/components/festa/chuva-de-confete"
import { Balao } from "@/components/marca/balao"
import { exigirUsuario } from "@/lib/auth/sessao"
import { avisosDoInicio, MENSAGENS, type AvisoDoInicio } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { NumeroAnimado } from "./numero-animado"

// Depende da sessão (cookies) ou da URL: o servidor espera antes de mostrar a página.
export const instant = false

// Cada tipo de aviso tem uma cor que diz o que é: vencido em coral, vencendo em sol, repor em azul.
const CARTAS: Record<Exclude<AvisoDoInicio["tipo"], "conferencia">, { icone: LucideIcon; cor: string; acao: string }> = {
  vencidos: { icone: TriangleAlert, cor: "icone-coral", acao: "Ver alertas" },
  vencendo: { icone: Clock, cor: "icone-sol", acao: "Ver alertas" },
  abaixoDoMinimo: { icone: ArrowDown, cor: "icone-azul", acao: "Ver alertas" },
  solicitacoes: { icone: ClipboardCheck, cor: "icone-magenta", acao: "Ver solicitações" },
}

export default async function PaginaInicio() {
  const usuario = await exigirUsuario()
  const supabase = await criarClienteServidor()
  // As contagens seguem quem está vendo: a funcionária conta só as solicitações dela e não vê a conferência.
  const { data: contagens, error } = await supabase.rpc("avisos_inicio").single()
  if (error) throw error
  const avisos = avisosDoInicio(contagens)
  const cartas = avisos.filter((aviso) => aviso.tipo !== "conferencia")
  const faixas = avisos.filter((aviso) => aviso.tipo === "conferencia")

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold sm:text-[2.5rem]">Início</h1>
        <p className="text-tinta-suave">Olá, {usuario.nome}</p>
      </header>
      <section aria-labelledby="avisos" className="flex flex-col gap-4">
        <h2 id="avisos" className="text-xl font-semibold">
          Avisos
        </h2>
        {avisos.length === 0 ? (
          <TudoEmDia />
        ) : (
          <>
            {cartas.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
                {cartas.map((aviso, i) => (
                  <CartaDeAviso key={aviso.tipo} aviso={aviso} ordem={i} />
                ))}
              </ul>
            ) : null}
            {faixas.map((aviso) => (
              <p key={aviso.tipo} className="vidro flex items-center gap-3 rounded-2xl border-coral/45 px-4 py-3 font-medium">
                <span aria-hidden="true" className="icone-jogo icone-coral size-9 rounded-[11px]">
                  <TriangleAlert className="size-[18px]" />
                </span>
                {aviso.texto}
              </p>
            ))}
          </>
        )}
      </section>
    </div>
  )
}

// A carta inteira é o link; o "botão" de baixo é só desenho, para o nome do link ser a frase do aviso.
function CartaDeAviso({ aviso, ordem }: { aviso: AvisoDoInicio; ordem: number }) {
  if (aviso.tipo === "conferencia" || aviso.quantidade === null || !aviso.link) return null
  const { icone: Icone, cor, acao } = CARTAS[aviso.tipo]
  return (
    <li className="entra-com-mola" style={{ "--i": ordem } as CSSProperties}>
      <Link
        href={aviso.link}
        className="vidro flex h-full flex-col gap-3 rounded-[26px] p-4 transition-[transform,box-shadow] duration-300 ease-mola hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_26px_44px_-18px_rgb(17_26_83/0.36)] sm:p-5"
      >
        <span aria-hidden="true" className={`icone-jogo ${cor} size-11 rounded-[14px] sm:size-12 sm:rounded-[16px]`}>
          <Icone className="size-6" />
        </span>
        <p className="leading-snug font-medium">
          <NumeroAnimado
            valor={aviso.quantidade}
            atraso={0.25 + ordem * 0.09}
            className="mb-2 block text-5xl leading-none font-extrabold tracking-[-0.03em] tabular-nums sm:text-6xl"
          />{" "}
          {aviso.resto}
        </p>
        <span
          aria-hidden="true"
          className="botao-jogo botao-claro mt-auto hidden h-11 items-center justify-center rounded-full bg-linear-to-b from-white to-[#f6f3fb] text-sm font-semibold sm:flex"
        >
          {acao}
        </span>
      </Link>
    </li>
  )
}

function TudoEmDia() {
  return (
    <div className="vidro relative flex items-center gap-5 rounded-[30px] px-6 py-6 sm:gap-7 sm:px-9">
      <ChuvaDeConfete origem={{ x: 72, y: 64 }} umaVezPorSessao="diboni:confete-tudo-em-dia" />
      <Balao className="boia w-[72px] shrink-0 sm:w-24" />
      <div className="flex flex-col gap-1.5">
        <h3 className="text-3xl font-extrabold sm:text-4xl">Tudo em dia!</h3>
        <p className="text-tinta-suave">{MENSAGENS.nenhumAviso}</p>
      </div>
    </div>
  )
}
