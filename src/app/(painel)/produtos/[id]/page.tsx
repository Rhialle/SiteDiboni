import { notFound } from "next/navigation"

import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { caminhosDasCategorias, montarArvore } from "@/lib/catalogo/arvore"
import { CAMPOS_MARCAVEIS, type CamposDoProduto } from "@/lib/catalogo/produto-form"
import { PROPRIEDADES, ROTULO_SITUACAO, ROTULO_TIPO_VENDA, TOM_SITUACAO } from "@/lib/catalogo/rotulos"
import { mensagemPendencias } from "@/lib/mensagens"
import { criarClienteServidor } from "@/lib/supabase/servidor"

import { BotaoInativar } from "./botao-inativar"
import { Compatibilidades, type Compatibilidade } from "./compatibilidades"
import { DadosGerais } from "./dados-gerais"
import { Fotos } from "./fotos"
import { FormasVenda, type FormaVenda } from "./formas-venda"
import { Grade } from "./grade"
import { Variacoes } from "./variacoes"

// Depende da sessão (cookies): o servidor espera antes de mostrar a página.
export const instant = false

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

  const ids = variacoes.map((v) => v.id)
  const [fotosR, compatR] = await Promise.all([
    supabase.from("fotos").select("id, caminho, ordem").eq("produto_id", id).order("ordem"),
    ids.length
      ? supabase
          .from("compatibilidades")
          .select("id, descricao, variacao_a_id, variacao_b_id")
          .or(`variacao_a_id.in.(${ids.join(",")}),variacao_b_id.in.(${ids.join(",")})`)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (fotosR.error) throw fotosR.error
  if (compatR.error) throw compatR.error

  const fotos = (fotosR.data ?? []).map((foto) => ({
    id: foto.id,
    url: supabase.storage.from("fotos-produtos").getPublicUrl(foto.caminho).data.publicUrl,
  }))

  // Para cada ligação, o lado que não é deste produto.
  const ladosDaqui = new Map(variacoes.map((v) => [v.id, v.nome]))
  const ligacoes = (compatR.data ?? []).map((c) => {
    const aquiEhA = ladosDaqui.has(c.variacao_a_id)
    return { ...c, daqui: aquiEhA ? c.variacao_a_id : c.variacao_b_id, outra: aquiEhA ? c.variacao_b_id : c.variacao_a_id }
  })
  const { data: outras, error: erroOutras } = ligacoes.length
    ? await supabase
        .from("variacoes")
        .select("id, nome, codigo_interno, produto_id, produtos(nome)")
        .in("id", ligacoes.map((l) => l.outra))
    : { data: [], error: null }
  if (erroOutras) throw erroOutras
  const compatibilidades: Compatibilidade[] = ligacoes.flatMap((l) => {
    const outra = (outras ?? []).find((o) => o.id === l.outra)
    return outra
      ? [{
          id: l.id,
          descricao: l.descricao,
          daqui: ladosDaqui.get(l.daqui) ?? "",
          outra: { produtoId: outra.produto_id, produto: outra.produtos.nome, variacao: outra.nome, codigo: outra.codigo_interno },
        }]
      : []
  })

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
          <h1 className="text-3xl font-bold sm:text-4xl">{produto.nome}</h1>
          <Selo tom={TOM_SITUACAO[produto.situacao ?? ""]}>
            {ROTULO_SITUACAO[produto.situacao ?? ""] ?? produto.situacao}
          </Selo>
        </div>
        <p className="text-sm text-muted-foreground">{ROTULO_TIPO_VENDA[campos.tipo_venda]}</p>
        {podeEditar ? <BotaoInativar produtoId={id} inativo={produto.inativo ?? false} /> : null}
        {produto.situacao === "incompleto" && pendencias.length > 0 ? (
          <p className="w-fit rounded-xl border border-[#f3cf6b] bg-[#fff4d1] px-3 py-2 text-sm font-medium text-[#6e4d00]">
            {mensagemPendencias(pendencias)}
          </p>
        ) : null}
      </header>

      <section className="vidro flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Dados</h2>
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

      <section className="vidro flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Variações</h2>
        <Variacoes produtoId={id} variacoes={variacoes} podeEditar={podeEditar} unidade={porPeso ? "g" : "un."} />
        {podeEditar ? <Grade produtoId={id} /> : null}
      </section>

      <section className="vidro flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Fotos</h2>
        <Fotos produtoId={id} nomeProduto={produto.nome ?? ""} fotos={fotos} podeEditar={podeEditar} />
      </section>

      <section className="vidro flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{porPeso ? "Preço por kg" : "Formas de venda"}</h2>
        <FormasVenda
          produtoId={id}
          porPeso={porPeso}
          variacoes={variacoes.filter((v) => v.ativa)}
          formas={formas}
          podeEditar={podeEditar}
        />
      </section>

      <section className="vidro flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Compatibilidades</h2>
        <Compatibilidades
          produtoId={id}
          variacoes={variacoes.filter((v) => v.ativa)}
          compatibilidades={compatibilidades}
          podeEditar={podeEditar}
        />
      </section>
    </div>
  )
}
