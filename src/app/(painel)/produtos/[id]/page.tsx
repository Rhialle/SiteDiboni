import { notFound } from "next/navigation"

import { exigirUsuario } from "@/lib/auth/sessao"
import { caminhosDasCategorias, montarArvore } from "@/lib/catalogo/arvore"
import { CAMPOS_MARCAVEIS, type CamposDoProduto } from "@/lib/catalogo/produto-form"
import { PROPRIEDADES, ROTULO_SITUACAO, ROTULO_TIPO_VENDA } from "@/lib/catalogo/rotulos"
import { mensagemPendencias } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { DadosGerais } from "./dados-gerais"
import { FormasVenda, type FormaVenda } from "./formas-venda"
import { Grade } from "./grade"
import { Variacoes } from "./variacoes"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

const COR_SITUACAO: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  incompleto: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  inativo: "bg-muted text-muted-foreground",
}

export default async function PaginaProduto({ params }: PageProps<"/produtos/[id]">) {
  const { id } = await params
  const usuario = await exigirUsuario()
  const podeEditar = usuario.papel === "administrador"

  const supabase = await criarClienteServidor()
  const [produtoR, variacoesR, categoriasR, materiaisR, ligadasR, marcadosR] = await Promise.all([
    supabase.from("produtos_com_situacao").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("variacoes")
      .select("id, nome, codigo_interno, codigo_barras, comprimento_mm, largura_mm, altura_mm, capacidade_ml, estoque_minimo, ativa")
      .eq("produto_id", id)
      .order("criado_em")
      .order("nome"),
    supabase.from("categorias").select("id, nome, categoria_pai_id, ordem"),
    supabase.from("etiquetas").select("id, nome").order("nome"),
    supabase.from("produto_categorias").select("categoria_id").eq("produto_id", id),
    supabase.from("produto_etiquetas").select("etiqueta_id").eq("produto_id", id),
  ])
  const produto = produtoR.data
  if (!produto) notFound()
  for (const r of [variacoesR, categoriasR, materiaisR, ligadasR, marcadosR]) if (r.error) throw r.error

  const variacoes = variacoesR.data ?? []
  const { data: formasBrutas, error: erroFormas } = await supabase
    .from("formas_venda")
    .select("id, variacao_id, nome, fator, preco_centavos, peso_variavel, ativa, faixas_preco(id, quantidade_minima, preco_centavos)")
    .in("variacao_id", variacoes.map((v) => v.id))
    .order("nome")
  if (erroFormas) throw erroFormas
  const formas: FormaVenda[] = (formasBrutas ?? []).map(({ faixas_preco, ...forma }) => ({
    ...forma,
    faixas: [...faixas_preco].sort((a, b) => a.quantidade_minima - b.quantidade_minima),
  }))

  const caminhos = caminhosDasCategorias(montarArvore(categoriasR.data ?? []))
  const campos: CamposDoProduto = {
    nome: produto.nome ?? "",
    descricao: produto.descricao ?? "",
    tipo_venda: produto.tipo_venda ?? "unidade",
    ncm: produto.ncm ?? "",
    cest: produto.cest ?? "",
    origem_fiscal: produto.origem_fiscal === null ? "" : String(produto.origem_fiscal),
    categorias: (ligadasR.data ?? []).map((c) => c.categoria_id),
    etiquetas: (marcadosR.data ?? []).map((m) => m.etiqueta_id),
    marcados: CAMPOS_MARCAVEIS.filter((campo) => produto[campo]),
  }
  const porPeso = produto.tipo_venda === "peso"
  const pendencias = produto.pendencias ?? []

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{produto.nome}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COR_SITUACAO[produto.situacao ?? ""] ?? ""}`}>
            {ROTULO_SITUACAO[produto.situacao ?? ""] ?? produto.situacao}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{ROTULO_TIPO_VENDA[campos.tipo_venda]}</p>
        {produto.situacao === "incompleto" && pendencias.length > 0 ? (
          <p className="text-sm text-amber-800 dark:text-amber-300">{mensagemPendencias(pendencias)}</p>
        ) : null}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Dados</h2>
        {podeEditar ? (
          <DadosGerais produtoId={id} salvos={campos} categorias={caminhos} materiais={materiaisR.data ?? []} />
        ) : (
          <dl className="grid max-w-2xl gap-2 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Descrição</dt>
            <dd>{campos.descricao || "—"}</dd>
            <dt className="text-muted-foreground">NCM</dt>
            <dd>{campos.ncm || "—"}</dd>
            <dt className="text-muted-foreground">Categorias</dt>
            <dd>{caminhos.filter((c) => campos.categorias.includes(c.id)).map((c) => c.caminho).join("; ") || "—"}</dd>
            <dt className="text-muted-foreground">Materiais</dt>
            <dd>{(materiaisR.data ?? []).filter((m) => campos.etiquetas.includes(m.id)).map((m) => m.nome).join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">Uso</dt>
            <dd>{PROPRIEDADES.filter((p) => campos.marcados.includes(p.campo)).map((p) => p.rotulo).join("; ") || "—"}</dd>
          </dl>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Variações</h2>
        <Variacoes produtoId={id} variacoes={variacoes} podeEditar={podeEditar} unidade={porPeso ? "g" : "un."} />
        {podeEditar ? <Grade produtoId={id} /> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{porPeso ? "Preço por kg" : "Formas de venda"}</h2>
        <FormasVenda
          produtoId={id}
          porPeso={porPeso}
          variacoes={variacoes.filter((v) => v.ativa)}
          formas={formas}
          podeEditar={podeEditar}
        />
      </section>
    </div>
  )
}
