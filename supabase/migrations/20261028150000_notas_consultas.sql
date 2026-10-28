-- Notas de entrada, parte 4: divergências com o fornecedor, busca pelo fornecedor e aviso no Início.

-- Itens de notas confirmadas em que chegou quantidade diferente da nota (sem valores).
create view public.divergencias_fornecedor
with (security_invoker = true)
as
select
  f.id as fornecedor_id,
  f.nome as fornecedor,
  f.cnpj,
  n.id as nota_id,
  n.numero,
  n.emitida_em,
  n.confirmada_em,
  i.numero_item,
  i.descricao,
  i.unidade,
  i.quantidade_base_nota,
  i.quantidade_base_recebida,
  i.quantidade_base_recebida - i.quantidade_base_nota as diferenca,
  p.nome as produto,
  v.nome as variacao,
  p.tipo_venda
from public.notas_entrada_itens i
join public.notas_entrada n on n.id = i.nota_id
join public.fornecedores f on f.id = n.fornecedor_id
join public.variacoes v on v.id = i.variacao_id
join public.produtos p on p.id = v.produto_id
where n.situacao = 'confirmada' and i.quantidade_base_recebida <> i.quantidade_base_nota;

revoke all on public.divergencias_fornecedor from anon;

-- A busca de produtos passa a achar também pelo nome do fornecedor (seção 10.3 da especificação).
-- Mesma assinatura e mesmo resultado da versão do plano 1.2.
create or replace function public.buscar_produtos(
  p_termo text default null,
  p_categoria uuid default null,
  p_situacao text default null,
  p_tipo_venda public.tipo_venda default null,
  p_controla_validade boolean default null,
  p_etiqueta uuid default null,
  p_limite integer default 50,
  p_deslocamento integer default 0
)
returns table (
  id uuid,
  nome text,
  situacao text,
  tipo_venda public.tipo_venda,
  variacoes integer,
  menor_preco_centavos integer,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive arvore as (
    -- A categoria escolhida e todas as que estão dentro dela.
    select c.id from public.categorias c where c.id = p_categoria
    union all
    select c.id from public.categorias c join arvore a on c.categoria_pai_id = a.id
  ),
  termo as (
    select extensions.unaccent('extensions.unaccent'::regdictionary, lower(trim(coalesce(p_termo, '')))) as texto
  )
  select
    p.id,
    p.nome,
    p.situacao,
    p.tipo_venda,
    (select count(*)::integer from public.variacoes v where v.produto_id = p.id),
    (
      select min(f.preco_centavos) from public.formas_venda f join public.variacoes v on v.id = f.variacao_id
      where v.produto_id = p.id and v.ativa and f.ativa
    ),
    count(*) over ()
  from public.produtos_com_situacao p
  cross join termo
  where (
      termo.texto = ''
      or extensions.unaccent('extensions.unaccent'::regdictionary, lower(p.nome)) like '%' || termo.texto || '%'
      or exists (
        select 1 from public.variacoes v
        where v.produto_id = p.id and (lower(v.codigo_interno) = termo.texto or v.codigo_barras = termo.texto)
      )
      or exists (
        select 1 from public.fornecedor_itens fi
        join public.fornecedores fo on fo.id = fi.fornecedor_id
        join public.variacoes v on v.id = fi.variacao_id
        where v.produto_id = p.id
          and extensions.unaccent('extensions.unaccent'::regdictionary, lower(fo.nome)) like '%' || termo.texto || '%'
      )
    )
    and (p_categoria is null or exists (
      select 1 from public.produto_categorias pc
      where pc.produto_id = p.id and pc.categoria_id in (select a.id from arvore a)
    ))
    and (p_situacao is null or p.situacao = p_situacao)
    and (p_tipo_venda is null or p.tipo_venda = p_tipo_venda)
    and (p_controla_validade is null or p.controla_validade = p_controla_validade)
    and (p_etiqueta is null or exists (
      select 1 from public.produto_etiquetas pe where pe.produto_id = p.id and pe.etiqueta_id = p_etiqueta
    ))
  order by p.nome
  limit p_limite offset p_deslocamento
$$;

-- O Início ganha a contagem de notas esperando o administrador (o retorno muda: recria a função).
drop function public.avisos_inicio();

create function public.avisos_inicio()
returns table (
  vencendo integer,
  faixa_maior integer,
  vencidos integer,
  abaixo_minimo integer,
  solicitacoes_pendentes integer,
  conferencia_em timestamptz,
  conferencia_divergencias integer,
  notas_aguardando integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with alertas as (
    select a.tipo from public.alertas_estoque() a
  ),
  ultima as (
    select executada_em, jsonb_array_length(divergencias) as quantas
    from public.verificacoes_integridade
    order by id desc
    limit 1
  )
  select
    (select count(*) from alertas where alertas.tipo = 'vencendo')::integer,
    (select max(d) from public.configuracoes c, unnest(c.dias_alerta_validade) as d where c.id = 1)::integer,
    (select count(*) from alertas where alertas.tipo = 'vencido')::integer,
    (select count(*) from alertas where alertas.tipo = 'abaixo_minimo')::integer,
    (select count(*) from public.solicitacoes_ajuste where situacao = 'pendente')::integer,
    (select executada_em from ultima),
    (select quantas from ultima)::integer,
    (select count(*) from public.notas_entrada where situacao = 'aguardando_administrador')::integer
$$;
