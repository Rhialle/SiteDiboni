-- Balcão (fase 2.1): a venda. Uma função grava tudo ou nada (V1): itens com o preço do catálogo
-- recalculado aqui (V3), desconto com limite (V4), pagamento em partes com troco (V5), saída pelo
-- vencimento (V6), venda sem saldo com entrada da falta (V7), custo da saída (V9) e número (V10).
-- O cancelamento (V11) estorna tudo; as movimentações de venda não se estornam fora dele.

create sequence public.vendas_numero;

create table public.vendas (
  id bigint generated always as identity primary key,
  numero bigint not null unique default nextval('public.vendas_numero'),
  caixa_id bigint not null references public.caixas (id),
  vendida_por uuid not null,
  vendida_em timestamptz not null default now(),
  subtotal_centavos integer not null check (subtotal_centavos >= 0),
  desconto_centavos integer not null check (desconto_centavos >= 0),
  total_centavos integer not null check (total_centavos >= 0),
  situacao public.situacao_venda not null default 'concluida',
  cancelada_por uuid,
  cancelada_em timestamptz,
  motivo_cancelamento text,
  check (desconto_centavos <= subtotal_centavos and total_centavos = subtotal_centavos - desconto_centavos),
  check ((situacao = 'cancelada') = (cancelada_em is not null))
);

-- A sequência do número pertence à coluna: limpar a tabela com "restart identity" (como os testes
-- fazem) recomeça a numeração junto.
alter sequence public.vendas_numero owned by public.vendas.numero;

create index vendas_caixa on public.vendas (caixa_id);
create index vendas_vendida_em on public.vendas (vendida_em desc);

create table public.venda_itens (
  id bigint generated always as identity primary key,
  venda_id bigint not null references public.vendas (id),
  variacao_id uuid not null references public.variacoes (id),
  forma_venda_id uuid not null references public.formas_venda (id),
  -- Em formas de venda; no granel, em gramas.
  quantidade bigint not null check (quantidade > 0),
  quantidade_base bigint not null check (quantidade_base > 0),
  -- Por forma; no granel, o preço do kg.
  preco_unitario_centavos integer not null check (preco_unitario_centavos >= 0),
  total_centavos integer not null check (total_centavos >= 0),
  quantidade_sem_saldo_base bigint not null default 0 check (quantidade_sem_saldo_base >= 0),
  conferido_por uuid,
  conferido_em timestamptz
);

create index venda_itens_venda on public.venda_itens (venda_id);
create index venda_itens_sem_saldo on public.venda_itens (id) where quantidade_sem_saldo_base > 0 and conferido_em is null;

create table public.venda_pagamentos (
  id bigint generated always as identity primary key,
  venda_id bigint not null references public.vendas (id),
  forma public.forma_pagamento not null,
  valor_centavos integer not null check (valor_centavos > 0),
  recebido_centavos integer,
  troco_centavos integer not null default 0 check (troco_centavos >= 0),
  check (forma = 'dinheiro' or (recebido_centavos is null and troco_centavos = 0)),
  check (recebido_centavos is null or recebido_centavos = valor_centavos + troco_centavos)
);

create index venda_pagamentos_venda on public.venda_pagamentos (venda_id);

alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.venda_pagamentos enable row level security;

-- Todo usuário ativo vê as vendas; o custo fica em movimentacoes_custos, só do administrador.
create policy "vendas: leitura por usuário ativo"
  on public.vendas for select to authenticated using (public.eh_usuario_ativo());
create policy "venda_itens: leitura por usuário ativo"
  on public.venda_itens for select to authenticated using (public.eh_usuario_ativo());
create policy "venda_pagamentos: leitura por usuário ativo"
  on public.venda_pagamentos for select to authenticated using (public.eh_usuario_ativo());
revoke insert, update, delete, truncate on public.vendas, public.venda_itens, public.venda_pagamentos from authenticated;
revoke all on public.vendas, public.venda_itens, public.venda_pagamentos from anon;

-- Preço de uma linha (V3), igual a src/lib/catalogo/preco.ts: faixa pela quantidade de formas; granel
-- pelo preço do kg × gramas ÷ 1000, meio para cima.
create function public.preco_da_linha(p_forma uuid, p_quantidade bigint)
returns table (preco_unitario_centavos integer, total_centavos integer)
language sql
stable
set search_path = ''
as $$
  select
    case when f.peso_variavel then f.preco_centavos
      else coalesce((
        select fx.preco_centavos from public.faixas_preco fx
        where fx.forma_venda_id = f.id and fx.quantidade_minima <= p_quantidade
        order by fx.quantidade_minima desc limit 1), f.preco_centavos)
    end,
    case when f.peso_variavel then ((f.preco_centavos::bigint * p_quantidade + 500) / 1000)::integer
      else (p_quantidade * coalesce((
        select fx.preco_centavos from public.faixas_preco fx
        where fx.forma_venda_id = f.id and fx.quantidade_minima <= p_quantidade
        order by fx.quantidade_minima desc limit 1), f.preco_centavos))::integer
    end
  from public.formas_venda f where f.id = p_forma
$$;

-- Busca da tela de venda. Código exato (de uma forma, de uma variação ou o interno) devolve só aquela
-- variação; outro texto busca pelo nome, sem acento, até 20. Só o que está à venda.
create function public.buscar_para_venda(p_termo text)
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
  from public.formas_venda f where f.codigo_barras = v_termo and f.ativa;
  if v_ids is null then
    v_ids := array(
      select v.id from public.variacoes v
      where v.codigo_barras = v_termo or v.codigo_interno = public.normalizar_codigo_interno(v_termo));
  end if;
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    v_nome := extensions.unaccent('extensions.unaccent'::regdictionary, lower(v_termo));
    v_ids := array(
      select v.id from public.variacoes v join public.produtos p on p.id = v.produto_id
      where v.ativa and not p.inativo
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
      from public.formas_venda f where f.variacao_id = v.id and f.ativa), '[]'::jsonb)
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = any (v_ids) and v.ativa and not p.inativo
  order by p.nome, v.nome;
end;
$$;

-- O lote que recebe a entrada da venda sem saldo (V7).
create function public.lote_da_venda_sem_saldo(p_variacao uuid, p_validade date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controla boolean;
  v_lote uuid;
  v_produto text;
begin
  select p.controla_validade, p.nome || ' – ' || v.nome into v_controla, v_produto
  from public.variacoes v join public.produtos p on p.id = v.produto_id where v.id = p_variacao;
  if not v_controla then
    return public.lote_geral(p_variacao);
  end if;
  select l.id into v_lote from public.lotes l
  where l.variacao_id = p_variacao and l.validade >= public.hoje_sp()
  order by l.validade desc, l.criado_em desc, l.id desc
  limit 1;
  if v_lote is not null then
    return v_lote;
  end if;
  if p_validade is null then
    raise exception 'Informe a validade da embalagem de %.', v_produto;
  end if;
  if p_validade < public.hoje_sp() then
    raise exception 'A validade da embalagem de % já passou.', v_produto;
  end if;
  insert into public.lotes (variacao_id, codigo, validade)
  values (p_variacao, public.gerar_codigo_lote(p_variacao, 'VSS'), p_validade)
  returning id into v_lote;
  return v_lote;
end;
$$;

create function public.registrar_venda(
  p_itens jsonb,
  p_desconto_centavos integer,
  p_pagamentos jsonb,
  p_total_centavos integer
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
  select * into v_caixa from public.caixas where situacao = 'aberto' for update;
  if not found then
    raise exception 'Abra o caixa antes de vender.';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
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

  insert into public.vendas (caixa_id, vendida_por, subtotal_centavos, desconto_centavos, total_centavos)
  values (v_caixa.id, auth.uid(), v_subtotal, p_desconto_centavos, v_total)
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

-- O estorno avulso não pega movimentação de venda: elas só saem pelo cancelamento da venda.
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
  if v_original.tipo in ('venda', 'entrada_venda_sem_saldo')
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

-- V11: só o administrador; estorna primeiro as saídas e depois as entradas da venda sem saldo.
create function public.cancelar_venda(p_venda bigint, p_motivo text)
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
  for v_mov in
    select m.id from public.movimentacoes m
    where m.origem = 'venda' and m.origem_id = p_venda::text and m.tipo in ('venda', 'entrada_venda_sem_saldo')
    order by (m.tipo = 'entrada_venda_sem_saldo'), m.id
  loop
    perform public.estornar_movimentacao(v_mov.id, 'Cancelamento da venda nº ' || v_venda.numero || ': ' || trim(p_motivo));
  end loop;
  perform set_config('diboni.cancelando_venda', '', true);

  update public.vendas set
    situacao = 'cancelada', cancelada_por = auth.uid(), cancelada_em = now(), motivo_cancelamento = trim(p_motivo)
  where id = p_venda;
end;
$$;

create function public.vendas_sem_saldo()
returns table (
  item_id bigint,
  numero bigint,
  vendida_em timestamptz,
  produto text,
  variacao text,
  quantidade_sem_saldo_base bigint,
  tipo_venda public.tipo_venda
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  return query
  select i.id, vd.numero, vd.vendida_em, p.nome, v.nome, i.quantidade_sem_saldo_base, p.tipo_venda
  from public.venda_itens i
  join public.vendas vd on vd.id = i.venda_id
  join public.variacoes v on v.id = i.variacao_id
  join public.produtos p on p.id = v.produto_id
  where i.quantidade_sem_saldo_base > 0 and i.conferido_em is null and vd.situacao = 'concluida'
  order by vd.vendida_em, i.id;
end;
$$;

create function public.conferir_venda_sem_saldo(p_item bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  update public.venda_itens set conferido_por = auth.uid(), conferido_em = now()
  where id = p_item and quantidade_sem_saldo_base > 0 and conferido_em is null;
  if not found then
    raise exception 'Item não encontrado.';
  end if;
end;
$$;

-- O caixa passa a contar as vendas: o esperado soma as partes de cada forma das vendas concluídas
-- (no dinheiro, a parte já é o valor menos o troco).
create or replace function public.vendas_do_caixa(p_caixa bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.vendas where caixa_id = p_caixa and situacao = 'concluida'
$$;

create or replace function public.esperado_do_caixa(p_caixa bigint)
returns table (forma public.forma_pagamento, esperado_centavos integer)
language sql
stable
security definer
set search_path = ''
as $$
  with vendido as (
    select vp.forma, sum(vp.valor_centavos) as valor
    from public.venda_pagamentos vp join public.vendas v on v.id = vp.venda_id
    where v.caixa_id = p_caixa and v.situacao = 'concluida'
    group by vp.forma
  )
  select 'dinheiro'::public.forma_pagamento,
    (c.troco_inicial_centavos
      + coalesce((select sum(valor_centavos) from public.caixa_movimentos where caixa_id = c.id and tipo = 'reforco'), 0)
      - coalesce((select sum(valor_centavos) from public.caixa_movimentos where caixa_id = c.id and tipo = 'retirada'), 0)
      + coalesce((select valor from vendido where vendido.forma = 'dinheiro'), 0)
    )::integer
  from public.caixas c where c.id = p_caixa
  union all
  select f, coalesce((select valor from vendido where vendido.forma = f), 0)::integer
  from unnest(array['cartao_credito', 'cartao_debito', 'pix']::public.forma_pagamento[]) as f
$$;

revoke execute on function public.lote_da_venda_sem_saldo(uuid, date) from public, anon, authenticated;
revoke execute on function public.preco_da_linha(uuid, bigint) from public, anon;
