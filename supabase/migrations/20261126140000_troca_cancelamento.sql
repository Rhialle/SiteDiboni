-- Troca no balcão (fase 2.4): cancelar uma venda com troca estorna também as entradas do devolvido
-- (T12); a entrada de troca só sai pelo cancelamento, como as outras movimentações da venda.

create or replace function public.estornar_movimentacao(p_movimentacao bigint, p_motivo text)
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
  if v_original.tipo in ('venda', 'entrada_venda_sem_saldo', 'entrada_troca')
     and current_setting('diboni.cancelando_venda', true) is distinct from 'sim' then
    raise exception 'Movimentação de venda só sai pelo cancelamento da venda.';
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

-- V11 e T12: só o administrador; estorna as saídas, depois as entradas da venda sem saldo e as
-- do devolvido. O devolvido que já foi vendido de novo impede o cancelamento.
create or replace function public.cancelar_venda(p_venda bigint, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda public.vendas;
  v_mov record;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Informe o motivo.';
  end if;
  select * into v_venda from public.vendas where id = p_venda for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;
  if v_venda.situacao = 'cancelada' then
    raise exception 'Esta venda já foi cancelada.';
  end if;

  perform set_config('diboni.cancelando_venda', 'sim', true);
  -- As saídas voltam primeiro; depois saem as entradas da venda sem saldo e as do devolvido na troca.
  for v_mov in
    select m.id, m.tipo, m.lote_id, m.quantidade, m.variacao_id from public.movimentacoes m
    where m.origem = 'venda' and m.origem_id = p_venda::text and m.tipo in ('venda', 'entrada_venda_sem_saldo', 'entrada_troca')
    order by case m.tipo when 'venda' then 0 when 'entrada_venda_sem_saldo' then 1 else 2 end, m.id
  loop
    -- T12: o devolvido que já saiu de novo não volta; o estoque nunca fica negativo (R1).
    if v_mov.tipo = 'entrada_troca' then
      perform public.travar_saldos(array[v_mov.variacao_id]);
      if coalesce((select s.quantidade from public.saldos s where s.lote_id = v_mov.lote_id), 0) < v_mov.quantidade then
        raise exception 'O produto devolvido na troca já saiu do estoque: não dá para cancelar esta venda.';
      end if;
    end if;
    perform public.estornar_movimentacao(v_mov.id, 'Cancelamento da venda nº ' || v_venda.numero || ': ' || trim(p_motivo));
  end loop;
  perform set_config('diboni.cancelando_venda', '', true);

  update public.vendas set
    situacao = 'cancelada', cancelada_por = auth.uid(), cancelada_em = now(), motivo_cancelamento = trim(p_motivo)
  where id = p_venda;
end;
$$;
