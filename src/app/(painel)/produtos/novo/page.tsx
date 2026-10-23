import { exigirAdministrador } from "@/lib/auth/sessao"
import { caminhosDasCategorias, montarArvore } from "@/lib/catalogo/arvore"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { FormularioNovoProduto } from "./formulario-novo-produto"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

export default async function PaginaNovoProduto() {
  await exigirAdministrador()

  const supabase = await criarClienteServidor()
  const [{ data: categorias, error: erroCategorias }, { data: materiais, error: erroMateriais }] =
    await Promise.all([
      supabase.from("categorias").select("id, nome, categoria_pai_id, ordem"),
      supabase.from("etiquetas").select("id, nome").order("nome"),
    ])
  if (erroCategorias) throw erroCategorias
  if (erroMateriais) throw erroMateriais

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Novo produto</h1>
      <FormularioNovoProduto
        categorias={caminhosDasCategorias(montarArvore(categorias))}
        materiais={materiais}
      />
    </div>
  )
}
