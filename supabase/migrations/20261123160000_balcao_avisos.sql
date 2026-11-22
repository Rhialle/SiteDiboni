-- Balcão (fase 2.1): avisos novos no Início. Vendas sem saldo a conferir e caixas fechados com
-- diferença (só o administrador), e o caixa aberto desde outro dia (todos).

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
  notas_aguardando integer,
  vendas_sem_saldo integer,
  caixas_com_diferenca integer,
  caixa_aberto_desde timestamptz
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
    (select count(*) from public.notas_entrada where situacao = 'aguardando_administrador')::integer,
    case when public.eh_administrador() then (
      select count(*) from public.venda_itens i join public.vendas v on v.id = i.venda_id
      where i.quantidade_sem_saldo_base > 0 and i.conferido_em is null and v.situacao = 'concluida'
    ) else 0 end::integer,
    -- A tabela de caixas só abre para o administrador: para os outros, zero.
    (select count(*) from public.caixas c
      where c.situacao = 'fechado' and c.conferido_em is null
        and exists (select 1 from public.linhas_do_fechamento(c) l where l.diferenca_centavos <> 0))::integer,
    (select a.aberto_em from public.caixa_aberto() a
      where (a.aberto_em at time zone 'America/Sao_Paulo')::date < public.hoje_sp())
$$;

-- O Início (security invoker) usa o cálculo das diferenças sobre a linha do caixa que o
-- administrador já lê; a função só faz conta com a linha recebida.
grant execute on function public.linhas_do_fechamento(public.caixas) to authenticated;
