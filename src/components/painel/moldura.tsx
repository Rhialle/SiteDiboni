import { cn } from "cn"
import type { ReactNode } from "react"

// Moldura de carregamento: aparece na hora do clique, com o título de verdade, e dá lugar aos dados
// quando o servidor responde. As barras têm o mesmo tamanho do que vão virar, para a tela não pular.

export function Barra({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("moldura block h-3.5", className)} />
}

// Envolve qualquer moldura: avisa o leitor de tela que a região está carregando.
export function Carregando({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  )
}

const LARGURAS_DE_FILTRO = ["w-72", "w-40", "w-32", "w-36", "w-36", "w-28"]
const LARGURAS_DE_CELULA = ["w-40", "w-20", "w-16", "w-14", "w-16", "w-24", "w-12"]

// Tela de lista (Produtos, Estoque): título, contagem, filtros e tabela.
export function MolduraDeLista({
  titulo,
  colunas,
  filtros = 1,
  linhas = 6,
  atalhos,
}: {
  titulo: string
  colunas: number
  filtros?: number
  linhas?: number
  // Links que não dependem dos dados já funcionam enquanto a tabela carrega.
  atalhos?: ReactNode
}) {
  return (
    <Carregando className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold sm:text-4xl">{titulo}</h1>
          <div className="flex h-5 items-center">
            <Barra className="w-24" />
          </div>
        </div>
        {atalhos}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {Array.from({ length: filtros }, (_, i) => (
          <div key={i} className={cn("flex max-w-full flex-col gap-2", LARGURAS_DE_FILTRO[i % LARGURAS_DE_FILTRO.length])}>
            <div className="flex h-5 items-center">
              <Barra className="w-16" />
            </div>
            <span aria-hidden="true" className="moldura block h-11 rounded-[14px]" />
          </div>
        ))}
        <span aria-hidden="true" className="moldura block h-11 w-24" />
      </div>

      <div className="tabela-vidro overflow-hidden">
        <div className="flex items-center gap-4 bg-lilas/80 px-4 py-3.5">
          {Array.from({ length: colunas }, (_, c) => (
            <Celula key={c} coluna={c} className="h-3 w-14" />
          ))}
        </div>
        {Array.from({ length: linhas }, (_, l) => (
          <div key={l} className="flex items-center gap-4 border-t px-4 py-4">
            {Array.from({ length: colunas }, (_, c) => (
              <Celula key={c} coluna={c} className={LARGURAS_DE_CELULA[c % LARGURAS_DE_CELULA.length]} />
            ))}
          </div>
        ))}
      </div>
    </Carregando>
  )
}

// No celular cabem três colunas; as outras só aparecem em tela larga.
function Celula({ coluna, className }: { coluna: number; className: string }) {
  return (
    <span className={cn("min-w-0 flex-1", coluna > 2 && "hidden sm:block")}>
      <Barra className={cn("max-w-full", className)} />
    </span>
  )
}
