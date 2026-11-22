import Link from "next/link"

import { mensagemNaoContadas } from "@/lib/mensagens"

export type VariacaoNaoContada = {
  variacao_id: string
  produto: string
  variacao: string
  codigo_interno: string
}

// As variações do escopo que ainda não foram contadas, sem saldo (a contagem é às cegas).
// Fechada por padrão: na loja inteira a lista pode ter centenas de linhas. Na contagem, cada
// linha busca aquele item para contar na hora.
export function FaltaContar({ variacoes, buscar }: { variacoes: VariacaoNaoContada[]; buscar: boolean }) {
  if (variacoes.length === 0) return null
  return (
    <details className="vidro rounded-3xl p-4 sm:p-5">
      <summary className="cursor-pointer font-medium">{mensagemNaoContadas(variacoes.length)}</summary>
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
