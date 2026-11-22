import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
import { exigirAdministrador } from "@/lib/auth/sessao"
import { caminhosDasCategorias, montarArvore } from "@/lib/catalogo/arvore"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { FormularioNovoProduto } from "./formulario-novo-produto"

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaNovoProduto() {
  return (
    <Suspense fallback={<MolduraDeFicha titulo="Novo produto" descricao={false} />}>
      <NovoProduto />
    </Suspense>
  )
}

async function NovoProduto() {
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
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold sm:text-4xl">Novo produto</h1>
      <FormularioNovoProduto
        categorias={caminhosDasCategorias(montarArvore(categorias))}
        materiais={materiais}
      />
    </div>
  )
}
