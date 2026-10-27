-- Estoque, parte 6: busca da tela de estoque, alertas, avisos do Início e conferência diária (R2).

-- ---------------------------------------------------------------------------
-- Busca da tela de estoque: uma linha por variação, com saldo total e disponível (sem os vencidos)
-- ---------------------------------------------------------------------------

create function public.buscar_estoque(
  p_termo text default null,
  p_so_com_saldo boolean default false,
  p_limite integer default 50,
  p_deslocamento integer default 0
)
returns table (
  variacao_id uuid,
  produto_id uuid,
  produto text,
  variacao text,
  codigo_interno text,
  tipo_venda public.tipo_venda,
  controla_validade boolean,
  saldo_total bigint,
  saldo_disponivel bigint,
  estoque_minimo bigint,
  proxima_validade date,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with termo as (
    select extensions.unaccent('extensions.unaccent'::regdictionary, lower(trim(coalesce(p_termo, '')))) as texto
  ),
  estoque as (
    select
      s.variacao_id,
      sum(s.quantidade) as saldo_total,
      coalesce(sum(s.quantidade) filter (where l.validade is null or l.validade >= public.hoje_sp()), 0) as saldo_disponivel,
      min(l.validade) filter (where s.quantidade > 0 and l.validade >= public.hoje_sp()) as proxima_validade
    from public.saldos s
    join public.lotes l on l.id = s.lote_id
    group by s.variacao_id
  )
  select
    v.id,
    p.id,
    p.nome,
    v.nome,
    v.codigo_interno,
    p.tipo_venda,
    p.controla_validade,
    coalesce(e.saldo_total, 0)::bigint,
    coalesce(e.saldo_disponivel, 0)::bigint,
    v.estoque_minimo,
    e.proxima_validade,
    count(*) over ()
  from public.variacoes v
  join public.produtos p on p.id = v.produto_id
  left join estoque e on e.variacao_id = v.id
  cross join termo
  where (
      termo.texto = ''
      or extensions.unaccent('extensions.unaccent'::regdictionary, lower(p.nome || ' ' || v.nome)) like '%' || termo.texto || '%'
      or lower(v.codigo_interno) = termo.texto
      or v.codigo_barras = termo.texto
    )
    and (not p_so_com_saldo or coalesce(e.saldo_total, 0) > 0)
  order by p.nome, v.nome
  limit p_limite offset p_deslocamento
$$;

-- ---------------------------------------------------------------------------
-- Alertas: lotes vencendo (até o maior dia de configuracoes.dias_alerta_validade), vencidos com saldo
-- e variações abaixo do estoque mínimo (contando só o que não venceu)
-- ---------------------------------------------------------------------------

create function public.alertas_estoque()
returns table (
  tipo text,
  produto_id uuid,
  produto text,
  variacao_id uuid,
  variacao text,
  codigo_interno text,
  tipo_venda public.tipo_venda,
  lote_id uuid,
  lote text,
  validade date,
  dias_para_vencer integer,
  faixa_dias integer,
  saldo bigint,
  estoque_minimo bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with dias as (
    select unnest(dias_alerta_validade) as d from public.configuracoes where id = 1
  ),
  lotes_com_saldo as (
    select l.id, l.codigo, l.validade, l.variacao_id, s.quantidade, (l.validade - public.hoje_sp()) as faltam
    from public.lotes l
    join public.saldos s on s.lote_id = l.id
    where s.quantidade > 0 and l.validade is not null
  ),
  disponivel as (
    select s.variacao_id, sum(s.quantidade) as quantidade
    from public.saldos s
    join public.lotes l on l.id = s.lote_id
    where l.validade is null or l.validade >= public.hoje_sp()
    group by s.variacao_id
  )
  select
    case when x.faltam < 0 then 'vencido' else 'vencendo' end,
    p.id, p.nome, v.id, v.nome, v.codigo_interno, p.tipo_venda,
    x.id, x.codigo, x.validade, x.faltam,
    case when x.faltam >= 0 then (select min(d) from dias where d >= x.faltam) end,
    x.quantidade, v.estoque_minimo
  from lotes_com_saldo x
  join public.variacoes v on v.id = x.variacao_id
  join public.produtos p on p.id = v.produto_id
  where x.faltam < 0 or x.faltam <= (select max(d) from dias)
  union all
  select
    'abaixo_minimo',
    p.id, p.nome, v.id, v.nome, v.codigo_interno, p.tipo_venda,
    null, null, null, null, null,
    coalesce(d.quantidade, 0)::bigint, v.estoque_minimo
  from public.variacoes v
  join public.produtos p on p.id = v.produto_id
  left join disponivel d on d.variacao_id = v.id
  where v.ativa and not p.inativo and v.estoque_minimo > 0 and coalesce(d.quantidade, 0) < v.estoque_minimo
$$;

-- Uma linha com as contagens do Início. Solicitações e conferência seguem a RLS de quem pergunta:
-- a funcionária conta só as solicitações dela e não vê a conferência.
create function public.avisos_inicio()
returns table (
  vencendo integer,
  faixa_maior integer,
  vencidos integer,
  abaixo_minimo integer,
  solicitacoes_pendentes integer,
  conferencia_em timestamptz,
  conferencia_divergencias integer
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
    (select quantas from ultima)::integer
$$;

-- ---------------------------------------------------------------------------
-- Conferência diária: compara o saldo de cada lote com a soma das movimentações dele
-- ---------------------------------------------------------------------------

create function public.conferir_integridade_estoque()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.verificacoes_integridade (divergencias)
  select coalesce(
    jsonb_agg(
      jsonb_build_object('variacao_id', d.variacao_id, 'lote_id', d.lote_id, 'saldo', d.saldo, 'soma', d.soma)
      order by d.lote_id),
    '[]'::jsonb)
  from (
    select
      coalesce(s.variacao_id, m.variacao_id) as variacao_id,
      coalesce(s.lote_id, m.lote_id) as lote_id,
      coalesce(s.quantidade, 0) as saldo,
      coalesce(m.soma, 0) as soma
    from public.saldos s
    full join (
      select lote_id, variacao_id, sum(quantidade) as soma
      from public.movimentacoes
      group by lote_id, variacao_id
    ) m on m.lote_id = s.lote_id
    where coalesce(s.quantidade, 0) <> coalesce(m.soma, 0)
  ) d;
end;
$$;

revoke execute on function public.conferir_integridade_estoque() from public, anon, authenticated;

-- Todo dia às 03:00 de São Paulo (06:00 em UTC, o fuso do pg_cron).
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('conferir-estoque', '0 6 * * *', 'select public.conferir_integridade_estoque()');
