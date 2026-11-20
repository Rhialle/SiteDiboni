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

// Título e frase de apoio. O que a tela já sabe (nome fixo, explicação) aparece de verdade;
// o que depende dos dados (nome do produto, contagem) vira barra.
function Cabecalho({ titulo, descricao, atalhos }: Topo) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        {titulo ? (
          <h1 className="text-3xl font-bold sm:text-4xl">{titulo}</h1>
        ) : (
          <div className="flex h-9 items-center sm:h-10">
            <Barra className="h-7 w-64 max-w-full" />
          </div>
        )}
        {descricao ? (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        ) : descricao === false ? null : (
          <div className="flex h-5 items-center">
            <Barra className="w-24" />
          </div>
        )}
      </div>
      {atalhos}
    </div>
  )
}

const LARGURAS_DE_FILTRO = ["w-72", "w-40", "w-32", "w-36", "w-36", "w-28"]
const LARGURAS_DE_CELULA = ["w-40", "w-20", "w-16", "w-14", "w-16", "w-24", "w-12"]

function Filtros({ quantos }: { quantos: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {Array.from({ length: quantos }, (_, i) => (
        <div key={i} className={cn("flex max-w-full flex-col gap-2", LARGURAS_DE_FILTRO[i % LARGURAS_DE_FILTRO.length])}>
          <div className="flex h-5 items-center">
            <Barra className="w-16" />
          </div>
          <span aria-hidden="true" className="moldura block h-11 rounded-[14px]" />
        </div>
      ))}
      <span aria-hidden="true" className="moldura block h-11 w-24" />
    </div>
  )
}

function Tabela({ colunas, linhas }: { colunas: number; linhas: number }) {
  return (
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

// Painel de vidro com um título e campos, como os das fichas e dos formulários.
function Painel({ estreito }: { estreito?: boolean }) {
  return (
    <div className={cn("vidro flex flex-col gap-4 rounded-3xl p-5 sm:p-6", estreito && "max-w-xl")}>
      <Barra className="h-5 w-36" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Barra className="w-20" />
            <span aria-hidden="true" className="moldura block h-11 rounded-[14px]" />
          </div>
        ))}
      </div>
      <Barra className="w-2/3" />
    </div>
  )
}

type Topo = {
  // Sem título, a tela ainda não sabe o nome (ficha do produto, nota): entra uma barra no lugar.
  titulo?: string
  // Frase fixa da tela; sem ela entra uma barra (contagem, tipo do produto); false quando a tela não tem.
  descricao?: string | false
  // Links que não dependem dos dados já funcionam enquanto o resto carrega.
  atalhos?: ReactNode
}

// Tela de lista (Produtos, Estoque, Movimentações): título, filtros e tabela.
export function MolduraDeLista({
  colunas,
  filtros = 1,
  linhas = 6,
  ...topo
}: Topo & { colunas: number; filtros?: number; linhas?: number }) {
  return (
    <Carregando className="flex flex-col gap-6">
      <Cabecalho {...topo} />
      {filtros > 0 ? <Filtros quantos={filtros} /> : null}
      <Tabela colunas={colunas} linhas={linhas} />
    </Carregando>
  )
}

// Tela de ficha ou formulário (produto, nota, inventário, configurações): título, painéis de vidro
// e, quando a tela tem uma, a tabela no fim.
export function MolduraDeFicha({
  paineis = 1,
  estreito,
  tabela,
  ...topo
}: Topo & { paineis?: number; estreito?: boolean; tabela?: number }) {
  return (
    <Carregando className="flex flex-col gap-6">
      <Cabecalho {...topo} />
      {Array.from({ length: paineis }, (_, i) => (
        <Painel key={i} estreito={estreito} />
      ))}
      {tabela ? <Tabela colunas={tabela} linhas={4} /> : null}
    </Carregando>
  )
}
