import Link from "next/link"
import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { exigirAdministrador } from "@/lib/auth/sessao"

import { ImportarPlanilha } from "./importar-planilha"

const DESCRICAO = "Cadastre e atualize muitos produtos de uma vez. A planilha nunca mexe no estoque nem no custo."

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaPlanilha() {
  return (
    <Suspense fallback={<MolduraDeFicha titulo="Planilha do catálogo" descricao={DESCRICAO} paineis={2} />}>
      <Planilha />
    </Suspense>
  )
}

async function Planilha() {
  await exigirAdministrador()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Planilha do catálogo</h1>
        <p className="text-sm text-muted-foreground">
          {DESCRICAO}
        </p>
      </div>

      <section aria-labelledby="baixar-titulo" className="vidro flex flex-col gap-3 rounded-3xl p-5">
        <h2 id="baixar-titulo" className="text-xl font-semibold">
          Baixar
        </h2>
        <p className="text-sm text-muted-foreground">
          O modelo vem vazio. A exportação traz o catálogo inteiro, para editar e importar de volta.
        </p>
        {/* Links comuns (não Link do Next): o navegador baixa o arquivo da rota. */}
        <div className="flex flex-wrap gap-2">
          <a href="/produtos/planilha/modelo" download className="link-pilula">
            Baixar modelo
          </a>
          <a href="/produtos/planilha/exportar" download className="link-pilula">
            Exportar catálogo
          </a>
        </div>
      </section>

      <ImportarPlanilha />

      <nav className="flex flex-wrap gap-2">
        <Link href="/produtos" className="link-pilula">
          Voltar para os produtos
        </Link>
      </nav>
    </div>
  )
}
