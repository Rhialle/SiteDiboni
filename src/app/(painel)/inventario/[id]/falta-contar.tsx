import Link from "next/link"

import { mensagemListaCortada, mensagemNaoContadas } from "@/lib/mensagens"

export type VariacaoNaoContada = {
  variacao_id: string
  produto: string
  variacao: string
  codigo_interno: string
}

// As variações do escopo que ainda não foram contadas, sem saldo (a contagem é às cegas).
// Fechada por padrão: na loja inteira a lista pode ter centenas de linhas. Na contagem, cada
// linha busca aquele item para contar na hora. O total vem do banco: a API corta a lista em 1000
// linhas, e o número e o aviso continuam certos.
export function FaltaContar({
  variacoes,
  total,
  buscar,
}: {
  variacoes: VariacaoNaoContada[]
  total: number
  buscar: boolean
}) {
  if (total === 0 || variacoes.length === 0) return null
  return (
    <details className="vidro rounded-3xl p-4 sm:p-5">
      <summary className="cursor-pointer font-medium">{mensagemNaoContadas(total)}</summary>
      {total > variacoes.length ? (
        <p className="mt-2 text-sm text-muted-foreground">{mensagemListaCortada(variacoes.length)}</p>
      ) : null}
      <ul className="mt-3 flex flex-col divide-y divide-tinta/10 text-sm">
        {variacoes.map((v) => {
          const nome = `${v.produto} – ${v.variacao}`
          const conteudo = (
            <>
              <span>{nome}</span> <span className="font-mono text-xs text-muted-foreground">{v.codigo_interno}</span>
            </>
          )
          return (
            <li key={v.variacao_id} className="py-2">
              {buscar ? (
                <Link href={`?q=${encodeURIComponent(v.codigo_interno)}`} className="hover:underline">
                  {conteudo}
                </Link>
              ) : (
                conteudo
              )}
            </li>
          )
        })}
      </ul>
    </details>
  )
}
