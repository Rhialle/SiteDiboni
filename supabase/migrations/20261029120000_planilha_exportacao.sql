-- Planilha, parte 1: forma de venda única pelo nome dentro da variação e o catálogo no formato da planilha.

-- A planilha acha a forma pelo nome. Antes do índice, se já houver nomes repetidos na mesma
-- variação, a migração para e mostra quais (nada é apagado: renomeie pela ficha e rode de novo).
do $$
declare
  v_repetidas text;
begin
  select string_agg(format('%s: %s', v.codigo_interno, f.nome), '; ' order by v.codigo_interno, f.nome)
  into v_repetidas
  from public.formas_venda f
  join public.variacoes v on v.id = f.variacao_id
  where (f.variacao_id, lower(trim(f.nome))) in (
    select variacao_id, lower(trim(nome)) from public.formas_venda group by 1, 2 having count(*) > 1
  );
  if v_repetidas is not null then
    raise exception 'Há formas de venda com o mesmo nome na mesma variação; renomeie antes: %', v_repetidas;
  end if;
end;
$$;

create unique index formas_venda_nome_por_variacao on public.formas_venda (variacao_id, lower(trim(nome)));

-- O catálogo inteiro no formato da planilha (seção 9.2), numa chamada só: a lista de produtos
-- passa de mil linhas, e um jsonb não esbarra no limite de linhas da API.
create function public.catalogo_para_planilha()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;

  with recursive caminhos (id, caminho) as (
    select c.id, c.nome::text from public.categorias c where c.categoria_pai_id is null
    union all
    select c.id, k.caminho || ' > ' || c.nome from public.categorias c join caminhos k on k.id = c.categoria_pai_id
  ),
  por_produto as (
    select
      p.id,
      coalesce((
        select jsonb_agg(k.caminho order by k.caminho)
        from public.produto_categorias pc join caminhos k on k.id = pc.categoria_id
        where pc.produto_id = p.id
      ), '[]') as categorias,
      coalesce((
        select jsonb_agg(e.nome order by e.nome)
        from public.produto_etiquetas pe join public.etiquetas e on e.id = pe.etiqueta_id
        where pe.produto_id = p.id
      ), '[]') as materiais,
      exists (
        select 1 from public.movimentacoes m join public.variacoes v on v.id = m.variacao_id where v.produto_id = p.id
      ) as tem_movimentacoes,
      exists (
        select 1 from public.saldos s join public.variacoes v on v.id = s.variacao_id
        where v.produto_id = p.id and s.quantidade > 0
      ) as tem_saldo
    from public.produtos p
  )
  select jsonb_build_object(
    'variacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'produto_id', p.id,
        'produto', p.nome,
        'variacao', v.nome,
        'codigo_interno', v.codigo_interno,
        'codigo_barras', v.codigo_barras,
        'ncm', p.ncm,
        'categorias', pp.categorias,
        'materiais', pp.materiais,
        'tipo_venda', p.tipo_venda,
        'controla_validade', p.controla_validade,
        'apto_forno', p.apto_forno,
        'apto_freezer', p.apto_freezer,
        'apto_microondas', p.apto_microondas,
        'apto_alimento', p.apto_alimento,
        'estoque_minimo', v.estoque_minimo,
        'comprimento_mm', v.comprimento_mm,
        'largura_mm', v.largura_mm,
        'altura_mm', v.altura_mm,
        'capacidade_ml', v.capacidade_ml,
        'tem_movimentacoes', pp.tem_movimentacoes,
        'tem_saldo', pp.tem_saldo,
        'tem_formas', exists (select 1 from public.formas_venda f where f.variacao_id = v.id)
      ) order by p.nome, v.codigo_interno)
      from public.variacoes v
      join public.produtos p on p.id = v.produto_id
      join por_produto pp on pp.id = p.id
    ), '[]'),
    'formas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo_interno', v.codigo_interno,
        'forma', f.nome,
        'fator', f.fator,
        'preco_centavos', f.preco_centavos,
        'faixas', coalesce((
          select jsonb_agg(jsonb_build_object('quantidade_minima', fx.quantidade_minima, 'preco_centavos', fx.preco_centavos)
            order by fx.quantidade_minima)
          from public.faixas_preco fx where fx.forma_venda_id = f.id
        ), '[]')
      ) order by v.codigo_interno, f.nome)
      from public.formas_venda f
      join public.variacoes v on v.id = f.variacao_id
      where f.ativa
    ), '[]')
  ) into v_resultado;

  return v_resultado;
end;
$$;
