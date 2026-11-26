-- Troca no balcão (fase 2.4). A troca é uma venda com uma parte devolvida: o devolvido fica em
-- venda_devolucoes, o valor dele em vendas.devolvido_centavos, e os pagamentos somam o total menos o
-- devolvido (por isso o esperado do caixa não muda). O devolvido entra no estoque (entrada_troca)
-- antes das saídas, pelo custo médio do momento. Nunca sai dinheiro: o devolvido não passa do total.

alter table public.vendas add column devolvido_centavos integer not null default 0;
alter table public.vendas add constraint vendas_devolvido
  check (devolvido_centavos >= 0 and devolvido_centavos <= total_centavos);

create table public.venda_devolucoes (
  id bigint generated always as identity primary key,
  venda_id bigint not null references public.vendas (id),
  variacao_id uuid not null references public.variacoes (id),
  forma_venda_id uuid not null references public.formas_venda (id),
  -- Em formas de venda; no granel, em gramas.
  quantidade bigint not null check (quantidade > 0),
  quantidade_base bigint not null check (quantidade_base > 0),
  -- Por forma; no granel, o preço do kg.
  preco_unitario_centavos integer not null check (preco_unitario_centavos >= 0),
  total_centavos integer not null check (total_centavos >= 0)
);

create index venda_devolucoes_venda on public.venda_devolucoes (venda_id);

alter table public.venda_devolucoes enable row level security;
create policy "venda_devolucoes: leitura por usuário ativo"
  on public.venda_devolucoes for select to authenticated using (public.eh_usuario_ativo());
revoke insert, update, delete, truncate on public.venda_devolucoes from authenticated;
revoke all on public.venda_devolucoes from anon;

-- Valor de uma linha devolvida (T2): o preço de 1 forma × a quantidade, sem a faixa (a etiqueta
-- mostra o preço de 1); granel pelo preço do kg × gramas ÷ 1000, meio para cima.
create function public.preco_da_devolucao(p_forma uuid, p_quantidade bigint)
returns table (preco_unitario_centavos integer, total_centavos integer)
language sql
stable
set search_path = ''
as $$
  select f.preco_centavos,
    case when f.peso_variavel then ((f.preco_centavos::bigint * p_quantidade + 500) / 1000)::integer
      else (p_quantidade * f.preco_centavos)::integer
    end
  from public.formas_venda f where f.id = p_forma
$$;

revoke execute on function public.preco_da_devolucao(uuid, bigint) from public, anon;

drop function public.registrar_venda(jsonb, integer, jsonb, integer, uuid);

create function public.registrar_venda(
  p_itens jsonb,
  p_desconto_centavos integer,
  p_pagamentos jsonb,
  p_total_centavos integer,
  p_chave uuid default null,
  p_devolvidos jsonb default '[]',
  p_devolvido_centavos integer default 0
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
  v_devolvido bigint := 0;
  v_dev record;
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

  -- Troca (T2, T4, T7): o devolvido vale o preço de 1 forma (sem faixa), recalculado aqui; pode ser
  -- de produto que não está mais à venda; não pode passar do total.
  if to_regclass('pg_temp.linhas_devolvidas') is null then
    create temp table linhas_devolvidas (
      ordem integer, forma uuid, variacao uuid, quantidade bigint, base bigint, unitario integer, total integer, validade date
    ) on commit drop;
  else
    delete from pg_temp.linhas_devolvidas;
  end if;
  if coalesce(jsonb_typeof(p_devolvidos), 'array') <> 'array' then
    raise exception 'Produto não encontrado.';
  end if;
  insert into pg_temp.linhas_devolvidas
  select d.ordem, f.id, f.variacao_id, (d.item ->> 'quantidade')::bigint,
    case when f.peso_variavel then (d.item ->> 'quantidade')::bigint else (d.item ->> 'quantidade')::bigint * f.fator end,
    pd.preco_unitario_centavos, pd.total_centavos, nullif(d.item ->> 'validade', '')::date
  from jsonb_array_elements(coalesce(p_devolvidos, '[]'::jsonb)) with ordinality as d (item, ordem)
  left join public.formas_venda f on f.id = (d.item ->> 'forma_venda_id')::uuid
  left join lateral public.preco_da_devolucao(f.id, (d.item ->> 'quantidade')::bigint) pd on true;
  if exists (select 1 from pg_temp.linhas_devolvidas where forma is null) then
    raise exception 'Produto não encontrado.';
  end if;
  if exists (select 1 from pg_temp.linhas_devolvidas where quantidade is null or quantidade <= 0) then
    raise exception 'Informe uma quantidade inteira maior que zero.';
  end if;
  select coalesce(sum(total), 0) into v_devolvido from pg_temp.linhas_devolvidas;
  if coalesce(p_devolvido_centavos, 0) is distinct from v_devolvido then
    raise exception 'O valor do devolvido mudou: confira os preços e tente de novo.';
  end if;
  if v_devolvido > v_total then
    raise exception 'O devolvido vale mais que o que o cliente leva.';
  end if;

  -- Pagamentos (V5): a soma é o total menos o devolvido; só o dinheiro tem troco.
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
  if v_soma_pagamentos <> v_total - v_devolvido then
    raise exception 'A soma dos pagamentos não bate com o total.';
  end if;

  insert into public.vendas (caixa_id, vendida_por, subtotal_centavos, desconto_centavos, total_centavos, devolvido_centavos, chave)
  values (v_caixa.id, auth.uid(), v_subtotal, p_desconto_centavos, v_total, v_devolvido, p_chave)
  returning id, vendas.numero into v_venda, v_numero;
  v_motivo := 'Venda nº ' || v_numero;

  insert into public.venda_pagamentos (venda_id, forma, valor_centavos, recebido_centavos, troco_centavos)
  select v_venda, (x ->> 'forma')::public.forma_pagamento, (x ->> 'valor_centavos')::integer,
    (x ->> 'recebido_centavos')::integer,
    coalesce((x ->> 'recebido_centavos')::integer - (x ->> 'valor_centavos')::integer, 0)
  from jsonb_array_elements(coalesce(p_pagamentos, '[]'::jsonb)) x;
  select coalesce(sum(vp.troco_centavos), 0) into v_troco from public.venda_pagamentos vp where vp.venda_id = v_venda;

  -- R10: trava os saldos de todas as variações da venda e do devolvido, na mesma ordem, antes de
  -- qualquer movimentação.
  perform public.travar_saldos(array(
    select x.variacao from (
      select l.variacao from pg_temp.linhas_da_venda l
      union
      select d.variacao from pg_temp.linhas_devolvidas d) x
    order by 1));

  -- T6: o devolvido entra antes das saídas (se for a mesma variação, já conta como saldo), no lote
  -- da regra da venda sem saldo e pelo custo médio do momento (o custo médio não muda).
  for v_dev in select * from pg_temp.linhas_devolvidas order by variacao, ordem loop
    insert into public.venda_devolucoes (
      venda_id, variacao_id, forma_venda_id, quantidade, quantidade_base, preco_unitario_centavos, total_centavos)
    values (v_venda, v_dev.variacao, v_dev.forma, v_dev.quantidade, v_dev.base, v_dev.unitario, v_dev.total);
    v_lote := public.lote_da_venda_sem_saldo(v_dev.variacao, v_dev.validade);
    v_mov := public.movimentar_lote(
      v_lote, 'entrada_troca', v_dev.base, 'Troca na venda nº ' || v_numero, auth.uid(), 'venda', v_venda::text);
    select custo_medio into v_custo from public.custos_variacao where variacao_id = v_dev.variacao;
    if v_custo is not null then
      insert into public.movimentacoes_custos (movimentacao_id, custo_unitario) values (v_mov, v_custo);
    end if;
  end loop;

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

-- Busca da tela de venda; com p_devolucao (a parte Devolvido da troca), traz também o que não está
-- mais à venda (T7).
drop function public.buscar_para_venda(text);

create function public.buscar_para_venda(p_termo text, p_devolucao boolean default false)
returns table (
  variacao_id uuid,
  produto text,
  variacao text,
  codigo_interno text,
  tipo_venda public.tipo_venda,
  controla_validade boolean,
  disponivel bigint,
  so_vencido boolean,
  forma_exata uuid,
  formas jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_termo text := trim(coalesce(p_termo, ''));
  v_nome text;
  v_forma uuid;
  v_ids uuid[];
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if v_termo = '' then
    return;
  end if;

  select f.id, array[f.variacao_id] into v_forma, v_ids
  from public.formas_venda f where f.codigo_barras = v_termo and (f.ativa or p_devolucao);
  if v_ids is null then
    v_ids := array(
      select v.id from public.variacoes v
      where v.codigo_barras = v_termo or v.codigo_interno = public.normalizar_codigo_interno(v_termo));
  end if;
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    v_nome := extensions.unaccent('extensions.unaccent'::regdictionary, lower(v_termo));
    v_ids := array(
      select v.id from public.variacoes v join public.produtos p on p.id = v.produto_id
      where (p_devolucao or (v.ativa and not p.inativo))
        and extensions.unaccent('extensions.unaccent'::regdictionary, lower(p.nome || ' ' || v.nome))
          like '%' || v_nome || '%'
      order by p.nome, v.nome
      limit 20);
  end if;

  return query
  select v.id, p.nome, v.nome, v.codigo_interno, p.tipo_venda, p.controla_validade,
    coalesce((select sum(s.quantidade) from public.saldos s join public.lotes l on l.id = s.lote_id
      where s.variacao_id = v.id and s.quantidade > 0 and (l.validade is null or l.validade >= public.hoje_sp())), 0)::bigint,
    not exists (select 1 from public.saldos s join public.lotes l on l.id = s.lote_id
        where s.variacao_id = v.id and s.quantidade > 0 and (l.validade is null or l.validade >= public.hoje_sp()))
      and exists (select 1 from public.saldos s where s.variacao_id = v.id and s.quantidade > 0),
    case when v_forma is not null then v_forma end,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'nome', f.nome, 'fator', f.fator, 'preco_centavos', f.preco_centavos,
        'peso_variavel', f.peso_variavel, 'codigo_barras', f.codigo_barras,
        'faixas', coalesce((
          select jsonb_agg(jsonb_build_object('quantidade_minima', fx.quantidade_minima, 'preco_centavos', fx.preco_centavos)
            order by fx.quantidade_minima)
          from public.faixas_preco fx where fx.forma_venda_id = f.id), '[]'::jsonb))
        order by f.fator, f.nome)
      from public.formas_venda f where f.variacao_id = v.id and (f.ativa or p_devolucao)), '[]'::jsonb)
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = any (v_ids) and (p_devolucao or (v.ativa and not p.inativo))
  order by p.nome, v.nome;
end;
$$;
