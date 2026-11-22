import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { exigirAdministrador } from "@/lib/auth/sessao"
import { montarArvore } from "@/lib/catalogo/arvore"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { ArvoreCategorias } from "./arvore-categorias"
import { ListaMateriais } from "./lista-materiais"

const DESCRICAO = "Organize os produtos por uso (com subcategorias) e marque os materiais."

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaCategorias() {
  return (
    <Suspense fallback={<MolduraDeFicha titulo="Categorias" descricao={DESCRICAO} paineis={2} />}>
      <Categorias />
    </Suspense>
  )
}

async function Categorias() {
  const supabase = await criarClienteServidor()
  const [, { data: categorias, error: erroCategorias }, { data: materiais, error: erroMateriais }] =
    await Promise.all([
      exigirAdministrador(),
      supabase.from("categorias").select("id, nome, categoria_pai_id, ordem"),
      supabase.from("etiquetas").select("id, nome").order("nome"),
    ])
  if (erroCategorias) throw erroCategorias
  if (erroMateriais) throw erroMateriais

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          {DESCRICAO}
        </p>
      </div>
      <div className="vidro rounded-3xl p-5 sm:p-6">
        <ArvoreCategorias arvore={montarArvore(categorias)} />
      </div>
      <div className="vidro rounded-3xl p-5 sm:p-6">
        <ListaMateriais materiais={materiais} />
      </div>
    </div>
  )
}
