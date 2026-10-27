-- Estoque, parte 4: estorno (R2), custo médio no estorno de entrada (R9) e extrato.

-- Corrige uma movimentação com outra de quantidade oposta. Só o administrador; cada movimentação
-- é estornada uma vez; um estorno não se estorna; o estorno que deixaria saldo negativo é recusado.
create function public.estornar_movimentacao(p_movimentacao bigint, p_motivo text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_original public.movimentacoes;
  v_custo_entrada numeric;
  v_saldo_total bigint;
  v_custo_medio numeric;
  v_novo_custo numeric;
  v_id bigint;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if char_length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'Informe o motivo.';
  end if;

  select * into v_original from public.movimentacoes where id = p_movimentacao;
  if not found then
    raise exception 'Movimentação não encontrada.';
  end if;
  if v_original.tipo = 'estorno' then
    raise exception 'Um estorno não pode ser estornado.';
  end if;

  -- Trava os saldos antes de conferir: de dois estornos ao mesmo tempo, o segundo espera e vê o primeiro.
  perform public.travar_saldos(array[v_original.variacao_id]);
  if exists (select 1 from public.movimentacoes where estorno_de = p_movimentacao) then
    raise exception 'Esta movimentação já foi estornada.';
  end if;

  if v_original.tipo in ('entrada_nota', 'entrada_manual') then
    select custo_unitario into v_custo_entrada
    from public.movimentacoes_custos where movimentacao_id = p_movimentacao;
    select coalesce(sum(quantidade), 0) into v_saldo_total
    from public.saldos where variacao_id = v_original.variacao_id;
    select custo_medio into v_custo_medio
    from public.custos_variacao where variacao_id = v_original.variacao_id
    for update;
  end if;

  v_id := public.movimentar_lote(
    v_original.lote_id, 'estorno', -v_original.quantidade, trim(p_motivo), auth.uid(),
    p_estorno_de => p_movimentacao);

  -- R9: tira a entrada do custo médio. Com saldo restante zero, ou resultado negativo, fica o anterior.
  if v_custo_entrada is not null and v_custo_medio is not null and v_saldo_total - v_original.quantidade > 0 then
    v_novo_custo := round(
      (v_saldo_total * v_custo_medio - v_original.quantidade * v_custo_entrada) / (v_saldo_total - v_original.quantidade), 6);
    if v_novo_custo >= 0 then
      update public.custos_variacao
      set custo_medio = v_novo_custo, atualizado_em = now()
      where variacao_id = v_original.variacao_id;
    end if;
  end if;
  return v_id;
end;
$$;

-- Extrato para as telas: movimentação com produto, variação, lote e nomes de quem fez e de quem aprovou.
-- Sem nenhuma coluna de custo. O lote GERAL (produto sem validade) aparece vazio.
create view public.extrato_movimentacoes
with (security_invoker = true)
as
select
  m.id,
  m.criado_em,
  m.tipo,
  m.quantidade,
  m.motivo,
  m.origem,
  m.origem_id,
  m.estorno_de,
  exists (select 1 from public.movimentacoes e where e.estorno_de = m.id) as estornada,
  m.variacao_id,
  v.nome as variacao,
  v.codigo_interno,
  p.id as produto_id,
  p.nome as produto,
  p.tipo_venda,
  m.lote_id,
  case when l.validade is null and l.codigo = 'GERAL' then null else l.codigo end as lote,
  l.validade,
  u.nome as usuario,
  a.nome as aprovado_por_nome
from public.movimentacoes m
join public.variacoes v on v.id = m.variacao_id
join public.produtos p on p.id = v.produto_id
join public.lotes l on l.id = m.lote_id
left join public.usuarios u on u.id = m.usuario_id
left join public.usuarios a on a.id = m.aprovado_por;

revoke all on public.extrato_movimentacoes from anon;
