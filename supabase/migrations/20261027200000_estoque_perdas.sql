-- Estoque, parte 3: perdas e ajustes (R5 e R8) e solicitações acima do limite.

-- Regras de uma perda ou ajuste, conferidas ao registrar e de novo ao aprovar a solicitação.
-- Devolve o lote (o GERAL, quando o produto não controla validade e nenhum lote foi escolhido).
create function public.validar_perda_ou_ajuste(
  p_variacao uuid,
  p_lote uuid,
  p_tipo public.tipo_movimentacao,
  p_quantidade bigint,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controla boolean;
  v_tipo_venda public.tipo_venda;
  v_lote uuid := p_lote;
  v_validade date;
begin
  if char_length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'Informe o motivo.';
  end if;
  if p_tipo is null or p_tipo not in ('ajuste_manual', 'perda_avaria', 'perda_vencimento', 'quebra_pesagem') then
    raise exception 'Escolha o tipo: perda, quebra ou ajuste.';
  end if;
  if p_quantidade is null or p_quantidade = 0 then
    raise exception 'Informe uma quantidade inteira maior que zero.';
  end if;
  if p_tipo <> 'ajuste_manual' and p_quantidade > 0 then
    raise exception 'Perda e quebra só tiram do estoque.';
  end if;

  select p.controla_validade, p.tipo_venda into v_controla, v_tipo_venda
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = p_variacao;
  if v_controla is null then
    raise exception 'Variação não encontrada.';
  end if;
  if p_tipo = 'quebra_pesagem' and v_tipo_venda <> 'peso' then
    raise exception 'Quebra de pesagem é só para produto vendido por peso.';
  end if;

  -- R5: o lote é informado; só o produto sem controle de validade usa o GERAL sozinho.
  if v_lote is null then
    if v_controla then
      raise exception 'Escolha o lote.';
    end if;
    v_lote := public.lote_geral(p_variacao);
  end if;
  select validade into v_validade from public.lotes where id = v_lote and variacao_id = p_variacao;
  if not found then
    raise exception 'Escolha o lote.';
  end if;

  if p_tipo = 'perda_vencimento' and (v_validade is null or v_validade >= public.hoje_sp()) then
    raise exception 'Perda por vencimento é só para lote vencido.';
  end if;
  if p_quantidade < 0 and v_validade < public.hoje_sp() and p_tipo <> 'perda_vencimento' then
    raise exception 'Lote vencido só sai como perda por vencimento.';
  end if;
  return v_lote;
end;
$$;

revoke execute on function public.validar_perda_ou_ajuste(uuid, uuid, public.tipo_movimentacao, bigint, text)
  from public, anon, authenticated;

-- Perda ou ajuste. O administrador não tem limite. Para a funcionária, acima de
-- limite_ajuste_centavos (|quantidade| × custo médio), ou sem custo médio, vira solicitação (R8).
-- Devolve 'registrada' ou 'solicitacao'; nunca mostra o custo.
create function public.registrar_perda_ou_ajuste(
  p_variacao uuid,
  p_lote uuid,
  p_tipo public.tipo_movimentacao,
  p_quantidade bigint,
  p_motivo text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lote uuid;
  v_saldo bigint;
  v_unidade text;
  v_custo numeric;
  v_limite integer;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  v_lote := public.validar_perda_ou_ajuste(p_variacao, p_lote, p_tipo, p_quantidade, p_motivo);

  -- O saldo é conferido já, mesmo quando a perda vai virar solicitação.
  perform public.travar_saldos(array[p_variacao]);
  select coalesce(s.quantidade, 0), case p.tipo_venda when 'peso' then 'g' else 'un' end
  into v_saldo, v_unidade
  from public.variacoes v
  join public.produtos p on p.id = v.produto_id
  left join public.saldos s on s.lote_id = v_lote
  where v.id = p_variacao;
  if v_saldo + p_quantidade < 0 then
    raise exception 'Saldo insuficiente: há % % neste lote.', v_saldo, v_unidade;
  end if;

  if not public.eh_administrador() then
    select custo_medio into v_custo from public.custos_variacao where variacao_id = p_variacao;
    select limite_ajuste_centavos into v_limite from public.configuracoes where id = 1;
    if v_custo is null or round(abs(p_quantidade) * v_custo * 100) > v_limite then
      insert into public.solicitacoes_ajuste (variacao_id, lote_id, tipo, quantidade, motivo, solicitado_por)
      values (p_variacao, v_lote, p_tipo, p_quantidade, trim(p_motivo), auth.uid());
      return 'solicitacao';
    end if;
  end if;

  perform public.movimentar_lote(v_lote, p_tipo, p_quantidade, trim(p_motivo), auth.uid());
  return 'registrada';
end;
$$;

-- O administrador aprova (a movimentação sai em nome de quem pediu) ou recusa.
create function public.decidir_solicitacao(p_solicitacao bigint, p_aprovar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.solicitacoes_ajuste;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;

  -- Trava a solicitação: duas aprovações ao mesmo tempo, só a primeira muda o estoque.
  select * into v_pedido from public.solicitacoes_ajuste where id = p_solicitacao for update;
  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;
  if v_pedido.situacao <> 'pendente' then
    raise exception 'Esta solicitação já foi decidida.';
  end if;

  if p_aprovar then
    perform public.validar_perda_ou_ajuste(
      v_pedido.variacao_id, v_pedido.lote_id, v_pedido.tipo, v_pedido.quantidade, v_pedido.motivo);
    perform public.travar_saldos(array[v_pedido.variacao_id]);
    perform public.movimentar_lote(
      v_pedido.lote_id, v_pedido.tipo, v_pedido.quantidade, v_pedido.motivo, v_pedido.solicitado_por,
      'solicitacao', v_pedido.id::text, null, auth.uid());
  end if;

  update public.solicitacoes_ajuste
  set situacao = (case when p_aprovar then 'aprovada' else 'recusada' end)::public.situacao_solicitacao,
      decidido_por = auth.uid(),
      decidido_em = now()
  where id = p_solicitacao;
end;
$$;
