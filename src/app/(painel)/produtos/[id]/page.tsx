import { notFound } from "next/navigation"
import { Suspense } from "react"

import { MolduraDeFicha } from "@/components/painel/moldura"
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

// A moldura aparece na hora do clique; a sessão e os dados chegam dentro dela.
export default function PaginaProduto({ params }: PageProps<"/produtos/[id]">) {
  return (
    <Suspense fallback={<MolduraDeFicha paineis={3} />}>
      <Produto params={params} />
    </Suspense>
  )
}

async function Produto({ params }: Pick<PageProps<"/produtos/[id]">, "params">) {
  const { id } = await params

  // Primeira rodada: a sessão e tudo o que só depende do produto, ao mesmo tempo.
  const supabase = await criarClienteServidor()
  const [usuario, produtoR, variacoesR, categoriasR, materiaisR, ligadasR, marcadosR, formasR, fotosR] =
    await Promise.all([
      exigirUsuario(),
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
      // As formas são buscadas pelo produto da variação, sem esperar a lista de variações.
      supabase
        .from("formas_venda")
        .select(
          "id, variacao_id, nome, fator, preco_centavos, peso_variavel, ativa, codigo_barras, faixas_preco(id, quantidade_minima, preco_centavos), variacoes!inner(produto_id)",
        )
        .eq("variacoes.produto_id", id)
        .order("nome"),
      supabase.from("fotos").select("id, caminho, ordem").eq("produto_id", id).order("ordem"),
    ])
  const podeEditar = usuario.papel === "administrador"
  const produto = produtoR.data
  if (!produto) notFound()
  for (const r of [variacoesR, categoriasR, materiaisR, ligadasR, marcadosR, formasR, fotosR]) if (r.error) throw r.error

  const variacoes = variacoesR.data ?? []
  const formas: FormaVenda[] = (formasR.data ?? []).map((forma) => ({
    id: forma.id,
    variacao_id: forma.variacao_id,
    nome: forma.nome,
    fator: forma.fator,
    preco_centavos: forma.preco_centavos,
    peso_variavel: forma.peso_variavel,
    ativa: forma.ativa,
    codigo_barras: forma.codigo_barras,
    faixas: [...forma.faixas_preco].sort((a, b) => a.quantidade_minima - b.quantidade_minima),
  }))
  const fotos = (fotosR.data ?? []).map((foto) => ({
    id: foto.id,
    url: supabase.storage.from("fotos-produtos").getPublicUrl(foto.caminho).data.publicUrl,
  }))

  // Segunda rodada: as compatibilidades das variações daqui, já com as duas pontas.
  const ids = variacoes.map((v) => v.id)
  const PONTA = "id, nome, codigo_interno, produto_id, produtos(nome)"
  const { data: compat, error: erroCompat } = ids.length
    ? await supabase
        .from("compatibilidades")
        .select(
          `id, descricao, variacao_a_id, variacao_b_id, a:variacoes!compatibilidades_variacao_a_id_fkey(${PONTA}), b:variacoes!compatibilidades_variacao_b_id_fkey(${PONTA})`,
        )
        .or(`variacao_a_id.in.(${ids.join(",")}),variacao_b_id.in.(${ids.join(",")})`)
    : { data: [], error: null }
  if (erroCompat) throw erroCompat

  // Para cada ligação, o lado que não é deste produto.
  const ladosDaqui = new Map(variacoes.map((v) => [v.id, v.nome]))
  const compatibilidades: Compatibilidade[] = (compat ?? []).flatMap((c) => {
    const aquiEhA = ladosDaqui.has(c.variacao_a_id)
    const daqui = aquiEhA ? c.variacao_a_id : c.variacao_b_id
    const outra = aquiEhA ? c.b : c.a
    return outra
      ? [{
          id: c.id,
          descricao: c.descricao,
          daqui: ladosDaqui.get(daqui) ?? "",
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
