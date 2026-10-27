-- Estoque, parte 5: saída "vence primeiro, sai primeiro" (R3), sem lote vencido (R4).
-- Nenhuma tela da fase 1 usa: a venda da fase 2 vai chamá-la.

-- Divide a saída entre os lotes com saldo e não vencidos, por validade (empate: o lote criado antes).
-- Devolve quanto saiu de cada lote. Se o disponível não basta, nada muda.
create function public.retirar_fefo(
  p_variacao uuid,
  p_quantidade bigint,
  p_tipo public.tipo_movimentacao,
  p_motivo text,
  p_usuario uuid,
  p_origem text default null,
  p_origem_id text default null
)
returns table (lote_id uuid, quantidade bigint)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_disponivel bigint;
  v_unidade text;
  v_falta bigint := p_quantidade;
  v_lote record;
  v_parte bigint;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Informe uma quantidade inteira maior que zero.';
  end if;

  perform public.travar_saldos(array[p_variacao]);

  select coalesce(sum(s.quantidade), 0) into v_disponivel
  from public.saldos s join public.lotes l on l.id = s.lote_id
  where s.variacao_id = p_variacao and s.quantidade > 0
    and (l.validade is null or l.validade >= public.hoje_sp());

  if v_disponivel < p_quantidade then
    select case p.tipo_venda when 'peso' then 'g' else 'un' end into v_unidade
    from public.variacoes v join public.produtos p on p.id = v.produto_id
    where v.id = p_variacao;
    raise exception 'Saldo insuficiente: há % % fora de lotes vencidos.', v_disponivel, v_unidade;
  end if;

  for v_lote in
    select s.lote_id as id, s.quantidade as saldo
    from public.saldos s join public.lotes l on l.id = s.lote_id
    where s.variacao_id = p_variacao and s.quantidade > 0
      and (l.validade is null or l.validade >= public.hoje_sp())
    order by l.validade nulls last, l.criado_em, l.id
  loop
    exit when v_falta = 0;
    v_parte := least(v_falta, v_lote.saldo);
    perform public.movimentar_lote(v_lote.id, p_tipo, -v_parte, p_motivo, p_usuario, p_origem, p_origem_id);
    lote_id := v_lote.id;
    quantidade := v_parte;
    return next;
    v_falta := v_falta - v_parte;
  end loop;
end;
$$;

revoke execute on function public.retirar_fefo(uuid, bigint, public.tipo_movimentacao, text, uuid, text, text)
  from public, anon, authenticated;
