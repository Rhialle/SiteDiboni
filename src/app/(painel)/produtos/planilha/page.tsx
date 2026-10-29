import Link from "next/link"

import { exigirAdministrador } from "@/lib/auth/sessao"

import { ImportarPlanilha } from "./importar-planilha"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaPlanilha() {
  await exigirAdministrador()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Planilha do catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre e atualize muitos produtos de uma vez. A planilha nunca mexe no estoque nem no custo.
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
