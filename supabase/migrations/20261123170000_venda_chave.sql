-- Balcão (fase 2.1, depois da revisão final): a chave da venda. A tela gera uma chave para cada
-- venda; se a internet cair na resposta e a pessoa concluir de novo, o banco devolve a venda já
-- gravada em vez de gravar outra. Também recusa itens nulos (só chamando a função direto).

alter table public.vendas add column chave uuid unique;

drop function public.registrar_venda(jsonb, integer, jsonb, integer);

create function public.registrar_venda(
  p_itens jsonb,
  p_desconto_centavos integer,
  p_pagamentos jsonb,
  p_total_centavos integer,
  p_chave uuid default null
)
returns table (venda_id bigint, numero bigint, troco_centavos integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_caixa public.caixas;
  v_limite integer;
  v_subtotal bigint := 0;
  v_total bigint;
  v_soma_pagamentos bigint := 0;
  v_troco bigint := 0;
  v_venda bigint;
  v_numero bigint;
  v_item record;
  v_pagamento record;
  v_item_id bigint;
  v_disponivel bigint;
  v_falta bigint;
  v_lote uuid;
  v_mov bigint;
  v_custo numeric;
  v_motivo text;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  -- A mesma venda enviada de novo (a resposta se perdeu): devolve a que já foi gravada.
  if p_chave is not null then
    select v.id, v.numero into v_venda, v_numero from public.vendas v where v.chave = p_chave;
    if v_venda is not null then
      venda_id := v_venda;
      numero := v_numero;
      select coalesce(sum(vp.troco_centavos), 0) into troco_centavos from public.venda_pagamentos vp where vp.venda_id = v_venda;
      return next;
      return;
    end if;
  end if;
  select * into v_caixa from public.caixas where situacao = 'aberto' for update;
  if not found then
    raise exception 'Abra o caixa antes de vender.';
  end if;
  if coalesce(jsonb_typeof(p_itens), '') <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'A venda não tem itens.';
  end if;

  -- As linhas, com o preço recalculado e o que está à venda conferido.
  if to_regclass('pg_temp.linhas_da_venda') is null then
    create temp table linhas_da_venda (
      ordem integer, forma uuid, variacao uuid, quantidade bigint, base bigint, unitario integer, total integer,
      validade date, nome text
    ) on commit drop;
  else
    delete from pg_temp.linhas_da_venda;
  end if;
  insert into pg_temp.linhas_da_venda
  select i.ordem, f.id, f.variacao_id, (i.item ->> 'quantidade')::bigint,
    case when f.peso_variavel then (i.item ->> 'quantidade')::bigint else (i.item ->> 'quantidade')::bigint * f.fator end,
    pl.preco_unitario_centavos, pl.total_centavos, nullif(i.item ->> 'validade_sem_saldo', '')::date,
    p.nome || ' – ' || v.nome
  from jsonb_array_elements(p_itens) with ordinality as i (item, ordem)
  left join public.formas_venda f on f.id = (i.item ->> 'forma_venda_id')::uuid
  left join public.variacoes v on v.id = f.variacao_id
  left join public.produtos p on p.id = v.produto_id
  left join lateral public.preco_da_linha(f.id, (i.item ->> 'quantidade')::bigint) pl on true;

  if exists (select 1 from pg_temp.linhas_da_venda where forma is null) then
    raise exception 'Produto não encontrado.';
  end if;
  if exists (select 1 from pg_temp.linhas_da_venda where quantidade is null or quantidade <= 0) then
    raise exception 'Informe uma quantidade inteira maior que zero.';
  end if;
  select l.nome into v_motivo
  from pg_temp.linhas_da_venda l
  join public.formas_venda f on f.id = l.forma
  join public.variacoes v on v.id = f.variacao_id
  join public.produtos p on p.id = v.produto_id
  where not (f.ativa and v.ativa and not p.inativo)
  limit 1;
  if v_motivo is not null then
    raise exception '% não está à venda.', v_motivo;
  end if;

  select coalesce(sum(total), 0) into v_subtotal from pg_temp.linhas_da_venda;
  if p_desconto_centavos is null or p_desconto_centavos < 0 or p_desconto_centavos > v_subtotal then
    raise exception 'Desconto inválido.';
  end if;
  select limite_desconto_percentual into v_limite from public.configuracoes where id = 1;
  if not public.eh_administrador() and p_desconto_centavos > round(v_subtotal * v_limite / 100.0) then
    raise exception 'Desconto acima de %: só o administrador pode dar.', v_limite || '%';
  end if;
  v_total := v_subtotal - p_desconto_centavos;
  if p_total_centavos is distinct from v_total then
    raise exception 'O total da venda mudou: confira os preços e tente de novo.';
  end if;

  -- Pagamentos (V5): a soma é o total; só o dinheiro tem troco.
  for v_pagamento in
    select (x ->> 'forma')::public.forma_pagamento as forma, (x ->> 'valor_centavos')::integer as valor,
      (x ->> 'recebido_centavos')::integer as recebido
    from jsonb_array_elements(coalesce(p_pagamentos, '[]'::jsonb)) x
  loop
    if v_pagamento.valor is null or v_pagamento.valor <= 0 then
      raise exception 'A soma dos pagamentos não bate com o total.';
    end if;
    if v_pagamento.forma <> 'dinheiro' and v_pagamento.recebido is not null then
      raise exception 'Só o pagamento em dinheiro tem troco.';
    end if;
    if v_pagamento.recebido is not null and v_pagamento.recebido < v_pagamento.valor then
      raise exception 'O valor recebido em dinheiro é menor que o valor a pagar.';
    end if;
    v_soma_pagamentos := v_soma_pagamentos + v_pagamento.valor;
  end loop;
  if v_soma_pagamentos <> v_total then
    raise exception 'A soma dos pagamentos não bate com o total.';
  end if;

  insert into public.vendas (caixa_id, vendida_por, subtotal_centavos, desconto_centavos, total_centavos, chave)
  values (v_caixa.id, auth.uid(), v_subtotal, p_desconto_centavos, v_total, p_chave)
  returning id, vendas.numero into v_venda, v_numero;
  v_motivo := 'Venda nº ' || v_numero;

  insert into public.venda_pagamentos (venda_id, forma, valor_centavos, recebido_centavos, troco_centavos)
  select v_venda, (x ->> 'forma')::public.forma_pagamento, (x ->> 'valor_centavos')::integer,
    (x ->> 'recebido_centavos')::integer,
    coalesce((x ->> 'recebido_centavos')::integer - (x ->> 'valor_centavos')::integer, 0)
  from jsonb_array_elements(coalesce(p_pagamentos, '[]'::jsonb)) x;
  select coalesce(sum(vp.troco_centavos), 0) into v_troco from public.venda_pagamentos vp where vp.venda_id = v_venda;

  -- R10: trava os saldos de todas as variações da venda, na mesma ordem, antes de qualquer saída.
  perform public.travar_saldos(array(select distinct l.variacao from pg_temp.linhas_da_venda l order by 1));

  for v_item in select * from pg_temp.linhas_da_venda order by variacao, ordem loop
    insert into public.venda_itens (
      venda_id, variacao_id, forma_venda_id, quantidade, quantidade_base, preco_unitario_centavos, total_centavos)
    values (v_venda, v_item.variacao, v_item.forma, v_item.quantidade, v_item.base, v_item.unitario, v_item.total)
    returning id into v_item_id;

    select coalesce(sum(s.quantidade), 0) into v_disponivel
    from public.saldos s join public.lotes l on l.id = s.lote_id
    where s.variacao_id = v_item.variacao and s.quantidade > 0
      and (l.validade is null or l.validade >= public.hoje_sp());

    -- V7: o que falta entra antes da saída; o custo médio não muda.
    if v_disponivel < v_item.base then
      v_falta := v_item.base - v_disponivel;
      v_lote := public.lote_da_venda_sem_saldo(v_item.variacao, v_item.validade);
      v_mov := public.movimentar_lote(
        v_lote, 'entrada_venda_sem_saldo', v_falta, 'Venda sem saldo nº ' || v_numero, auth.uid(),
        'venda', v_venda::text);
      select custo_medio into v_custo from public.custos_variacao where variacao_id = v_item.variacao;
      if v_custo is not null then
        insert into public.movimentacoes_custos (movimentacao_id, custo_unitario) values (v_mov, v_custo);
      end if;
      update public.venda_itens set quantidade_sem_saldo_base = v_falta where id = v_item_id;
    end if;

    perform public.retirar_fefo(v_item.variacao, v_item.base, 'venda', v_motivo, auth.uid(), 'venda', v_venda::text);
  end loop;

  -- V9: o custo médio do momento em cada saída.
  insert into public.movimentacoes_custos (movimentacao_id, custo_unitario)
  select m.id, cv.custo_medio
  from public.movimentacoes m join public.custos_variacao cv on cv.variacao_id = m.variacao_id
  where m.origem = 'venda' and m.origem_id = v_venda::text and m.tipo = 'venda';

  venda_id := v_venda;
  numero := v_numero;
  troco_centavos := v_troco;
  return next;
end;
$$;

