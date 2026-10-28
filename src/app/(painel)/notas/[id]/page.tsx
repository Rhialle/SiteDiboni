import Link from "next/link"
import { notFound } from "next/navigation"

import { Selo } from "@/components/ui/selo"
import { exigirUsuario } from "@/lib/auth/sessao"
import { formatarQuantidade } from "@/lib/estoque/quantidade"
import { formatarCusto, formatarData } from "@/lib/formatacao"
import { quantidadeDaNota } from "@/lib/notas/fator"
import { ROTULO_SITUACAO_NOTA, TOM_SITUACAO_NOTA } from "@/lib/notas/rotulos"
import { criarClienteServidor } from "@/lib/supabase/servidor"
import { formatarCnpj } from "@/lib/validacao/cnpj"

import { CriarProdutoDoItem, LigarItem } from "./ligar-item"
import { AcoesDaNota, Recebimento } from "./recebimento"

// Depende da sessão (cookies) e da URL: o servidor espera antes de mostrar a página.
export const instant = false

// Unidades base de volta para a unidade da nota (2500 un ÷ 1000 = "2,5" CX), para os campos.
function naUnidadeDaNota(base: number, fator: number): string {
  return quantidadeDaNota((base / fator).toFixed(4))
}

export default async function PaginaNota({ params }: PageProps<"/notas/[id]">) {
  const usuario = await exigirUsuario()
  const administrador = usuario.papel === "administrador"
  const { id } = await params

  const supabase = await criarClienteServidor()
  const [notaR, itensR, usuariosR] = await Promise.all([
    supabase
      .from("notas_entrada")
      .select("id, numero, serie, emitida_em, situacao, importada_por, importada_em, fornecedores(nome, cnpj)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("notas_entrada_itens")
      .select(
        "id, numero_item, codigo_fornecedor, descricao, codigo_barras, ncm, unidade, quantidade_nota, rastro, fator, quantidade_base_recebida, notas_entrada_item_lotes(codigo_lote, validade, quantidade_base), variacoes(id, nome, codigo_interno, produtos(id, nome, tipo_venda, controla_validade))",
      )
      .eq("nota_id", id)
      .order("numero_item"),
    supabase.from("usuarios").select("id, nome"),
  ])
  // Endereço com id inválido ou de nota que não existe.
  if (notaR.error || !notaR.data) notFound()
  if (itensR.error) throw itensR.error

  const nota = notaR.data
  const itens = itensR.data ?? []
  const aberta = nota.situacao === "em_revisao" || nota.situacao === "aguardando_administrador"
  const nomes = new Map((usuariosR.data ?? []).map((u) => [u.id, u.nome]))
  const semLigacao = itens.filter((item) => !item.variacoes)
  const ligados = itens.flatMap((item) =>
    item.variacoes && item.fator ? [{ ...item, variacao: item.variacoes, fator: item.fator }] : [],
  )

  // Valores só para o administrador (a tabela também só abre para ele). A sugestão de ligação é a
  // variação com o mesmo código de barras do XML.
  const codigosDeBarras = semLigacao.flatMap((item) => (item.codigo_barras ? [item.codigo_barras] : []))
  const [valoresR, sugestoesR] = administrador
    ? await Promise.all([
        supabase
          .from("notas_entrada_itens_valores")
          .select("item_id, custo_total, custo_unitario_base")
          .in(
            "item_id",
            itens.map((item) => item.id),
          ),
        codigosDeBarras.length
          ? supabase.from("variacoes").select("nome, codigo_barras, produtos(nome)").in("codigo_barras", codigosDeBarras)
          : null,
      ])
    : [null, null]
  const valores = new Map((valoresR?.data ?? []).map((v) => [v.item_id, v]))
  const sugestoes = new Map((sugestoesR?.data ?? []).map((s) => [s.codigo_barras, s]))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">Nota {nota.numero}</h1>
          <Selo tom={TOM_SITUACAO_NOTA[nota.situacao]}>{ROTULO_SITUACAO_NOTA[nota.situacao]}</Selo>
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Fornecedor</dt>
          <dd>
            {nota.fornecedores.nome} · CNPJ {formatarCnpj(nota.fornecedores.cnpj)}
          </dd>
          <dt className="text-muted-foreground">Série</dt>
          <dd>{nota.serie}</dd>
          <dt className="text-muted-foreground">Emitida em</dt>
          <dd>{formatarData(nota.emitida_em)}</dd>
          <dt className="text-muted-foreground">Importada por</dt>
          <dd>
            {nomes.get(nota.importada_por) ?? "—"} em {formatarData(nota.importada_em)}
          </dd>
        </dl>
      </header>

      <div className="tabela-vidro overflow-x-auto">
        <table aria-label="Itens da nota" className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Nº</th>
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium">Quantidade</th>
              <th className="px-3 py-2 font-medium">Ligação</th>
              <th className="px-3 py-2 font-medium">Recebido</th>
              {administrador ? (
                <>
                  <th className="px-3 py-2 font-medium">Custo total</th>
                  <th className="px-3 py-2 font-medium">Custo por unidade base</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const variacao = item.variacoes
              const valor = valores.get(item.id)
              return (
                <tr key={item.id} className="border-t align-top">
                  <td className="px-3 py-2 tabular-nums">{item.numero_item}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.codigo_fornecedor}</td>
                  <td className="px-3 py-2">{item.descricao}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {quantidadeDaNota(item.quantidade_nota)} {item.unidade}
                  </td>
                  <td className="px-3 py-2">
                    {variacao && item.fator ? (
                      <div className="flex flex-col gap-1">
                        {administrador ? (
                          <Link href={`/produtos/${variacao.produtos.id}`} className="font-medium hover:underline">
                            {variacao.produtos.nome} – {variacao.nome}
                          </Link>
                        ) : (
                          <span className="font-medium">
                            {variacao.produtos.nome} – {variacao.nome}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          1 {item.unidade} = {formatarQuantidade(item.fator, variacao.produtos.tipo_venda)}
                        </span>
                        {nota.situacao === "confirmada" ? (
                          <Link href={`/estoque/${variacao.id}`} className="text-xs underline-offset-4 hover:underline">
                            Ver estoque
                          </Link>
                        ) : null}
                        {administrador && aberta ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground">Trocar a ligação</summary>
                            <div className="pt-2">
                              <LigarItem
                                notaId={nota.id}
                                itemId={item.id}
                                unidade={item.unidade}
                                codigo={variacao.codigo_interno}
                                fator={String(item.fator)}
                              />
                            </div>
                          </details>
                        ) : null}
                      </div>
                    ) : administrador ? (
                      <Selo tom="atencao">Sem ligação</Selo>
                    ) : (
                      <span className="text-muted-foreground">Aguardando o administrador ligar este item</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {variacao && item.quantidade_base_recebida !== null
                      ? formatarQuantidade(item.quantidade_base_recebida, variacao.produtos.tipo_venda)
                      : "—"}
                  </td>
                  {administrador ? (
                    <>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {valor ? formatarCusto(valor.custo_total) : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {valor?.custo_unitario_base != null ? formatarCusto(valor.custo_unitario_base) : "—"}
                      </td>
                    </>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {administrador && aberta
        ? semLigacao.map((item) => {
            const sugestao = item.codigo_barras ? sugestoes.get(item.codigo_barras) : undefined
            const titulo = `item-${item.id}-titulo`
            return (
              <section key={item.id} aria-labelledby={titulo} className="vidro flex flex-col gap-4 rounded-3xl p-5">
                <div className="flex flex-col gap-1">
                  <h2 id={titulo} className="text-xl font-semibold">
                    Item {item.numero_item}: {item.descricao}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {quantidadeDaNota(item.quantidade_nota)} {item.unidade} · código do fornecedor{" "}
                    <span className="font-mono">{item.codigo_fornecedor}</span>
                    {sugestao ? ` · sugestão pelo código de barras: ${sugestao.produtos.nome} – ${sugestao.nome}` : ""}
                  </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">Ligar a uma variação</h3>
                    <LigarItem
                      notaId={nota.id}
                      itemId={item.id}
                      unidade={item.unidade}
                      codigo={sugestao ? (item.codigo_barras ?? "") : ""}
                      fator=""
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">Criar produto a partir do item</h3>
                    <CriarProdutoDoItem
                      notaId={nota.id}
                      itemId={item.id}
                      unidade={item.unidade}
                      descricao={item.descricao}
                      ncm={item.ncm ?? ""}
                      codigoBarras={item.codigo_barras ?? ""}
                      temLotes={Array.isArray(item.rastro) && item.rastro.length > 0}
                    />
                  </div>
                </div>
              </section>
            )
          })
        : null}

      {aberta && ligados.length > 0 ? (
        <section aria-labelledby="recebimento-titulo" className="vidro flex flex-col gap-4 rounded-3xl p-5">
          <div className="flex flex-col gap-1">
            <h2 id="recebimento-titulo" className="text-xl font-semibold">
              Recebimento
            </h2>
            <p className="text-sm text-muted-foreground">
              Confira o que chegou. Se veio menos, mude o Recebido (na unidade da nota) e salve antes de confirmar.
            </p>
          </div>
          {ligados.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 border-t pt-4 first-of-type:border-t-0 first-of-type:pt-0">
              <h3 className="font-semibold">
                Item {item.numero_item}: {item.variacao.produtos.nome} – {item.variacao.nome}
              </h3>
              {/* Trocar a ligação muda o fator: os campos recomeçam com as quantidades novas. */}
              <Recebimento
                key={`${item.variacao.id}-${item.fator}`}
                notaId={nota.id}
                itemId={item.id}
                numero={item.numero_item}
                unidade={item.unidade}
                recebido={naUnidadeDaNota(item.quantidade_base_recebida ?? 0, item.fator)}
                controlaValidade={item.variacao.produtos.controla_validade}
                lotes={[...item.notas_entrada_item_lotes]
                  .sort((a, b) => (a.validade ?? "9999-12-31").localeCompare(b.validade ?? "9999-12-31"))
                  .map((lote) => ({
                    codigo: lote.codigo_lote ?? "",
                    validade: lote.validade ?? "",
                    quantidade: naUnidadeDaNota(lote.quantidade_base, item.fator),
                  }))}
              />
            </div>
          ))}
        </section>
      ) : null}

      {/* Fica sempre na página: a mensagem de confirmada ou descartada continua à vista. */}
      <AcoesDaNota notaId={nota.id} emRevisao={nota.situacao === "em_revisao"} aberta={aberta} />

      <nav className="flex flex-wrap gap-2">
        <Link href="/notas" className="link-pilula">
          Voltar para as notas
        </Link>
      </nav>
    </div>
  )
}
