-- Inventário, parte 2: contagem às cegas, revisão e aprovação (seção 7, "Inventário").

-- O que quem conta precisa achar: variações do escopo pelo nome (sem acento), código interno ou
-- código de barras, com os lotes a contar e o que já foi contado. Nunca o saldo (contagem às cegas).
-- Produto sem validade conta no lote geral (criado aqui se ainda não existe); com validade, aparecem
-- os lotes com saldo e os já contados neste inventário.
create function public.itens_para_contar(p_inventario bigint, p_busca text)
returns table (
  variacao_id uuid,
  produto text,
  variacao text,
  codigo_interno text,
  tipo_venda public.tipo_venda,
  controla_validade boolean,
  lotes jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_termo text := extensions.unaccent('extensions.unaccent'::regdictionary, lower(trim(coalesce(p_busca, ''))));
  v_achadas uuid[];
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if not exists (select 1 from public.inventarios i where i.id = p_inventario) then
    raise exception 'Inventário não encontrado.';
  end if;

  v_achadas := array(
    select v.id
    from public.variacoes v join public.produtos p on p.id = v.produto_id
    where v.id in (select public.variacoes_do_inventario(p_inventario))
      and (
        extensions.unaccent('extensions.unaccent'::regdictionary, lower(p.nome || ' ' || v.nome)) like '%' || v_termo || '%'
        or v.codigo_interno = public.normalizar_codigo_interno(p_busca)
        or v.codigo_barras = trim(p_busca)
      )
    order by p.nome, v.nome
    limit 30);

  perform public.lote_geral(v.id)
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = any (v_achadas) and not p.controla_validade;

  return query
  select v.id, p.nome, v.nome, v.codigo_interno, p.tipo_venda, p.controla_validade,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('lote_id', l.id, 'codigo', l.codigo, 'validade', l.validade, 'contado', ii.quantidade_contada)
        order by l.validade nulls last, l.codigo)
      from public.lotes l
      left join public.inventario_itens ii on ii.lote_id = l.id and ii.inventario_id = p_inventario
      where l.variacao_id = v.id
        and case
          when p.controla_validade then
            ii.id is not null or exists (select 1 from public.saldos s where s.lote_id = l.id and s.quantidade > 0)
          else l.codigo = 'GERAL'
        end
    ), '[]')
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = any (v_achadas)
  order by p.nome, v.nome;
end;
$$;

-- Grava (ou substitui) a contagem de um lote com o saldo daquele momento. Sem lote: produto sem
-- validade usa o lote geral; com validade, é um lote que o sistema não conhece e nasce com saldo zero.
create function public.contar_item(
  p_inventario bigint,
  p_variacao uuid,
  p_lote uuid,
  p_quantidade bigint,
  p_validade date default null,
  p_codigo_lote text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_situacao public.situacao_inventario;
  v_controla boolean;
  v_lote uuid := p_lote;
  v_codigo text := nullif(trim(p_codigo_lote), '');
  v_validade_lote date;
  v_saldo bigint;
  v_id bigint;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  -- FOR SHARE: várias contagens ao mesmo tempo, mas o encerramento e a aprovação (FOR UPDATE) esperam por
  -- elas, e elas esperam o encerramento terminar (e então leem a situação nova).
  select i.situacao into v_situacao from public.inventarios i where i.id = p_inventario for share;
  if not found then
    raise exception 'Inventário não encontrado.';
  end if;
  if v_situacao <> 'aberto' then
    raise exception 'Este inventário não está mais em contagem.';
  end if;
  if p_variacao is null or p_variacao not in (select public.variacoes_do_inventario(p_inventario)) then
    raise exception 'Este item não está no escopo do inventário.';
  end if;
  if p_quantidade is null or p_quantidade < 0 then
    raise exception 'Informe a quantidade contada (0 se não há nenhum).';
  end if;

  select p.controla_validade into v_controla
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = p_variacao;

  if v_lote is null then
    if not v_controla then
      v_lote := public.lote_geral(p_variacao);
    else
      if p_validade is null then
        raise exception 'Informe a validade do lote.';
      end if;
      -- Um lote novo por variação de cada vez (como na entrada): o código gerado não se repete.
      perform 1 from public.variacoes v where v.id = p_variacao for no key update;
      v_codigo := coalesce(v_codigo, public.gerar_codigo_lote(p_variacao, 'INV'));
      select l.id, l.validade into v_lote, v_validade_lote
      from public.lotes l where l.variacao_id = p_variacao and l.codigo = v_codigo;
      if v_lote is null then
        insert into public.lotes (variacao_id, codigo, validade) values (p_variacao, v_codigo, p_validade)
        returning id into v_lote;
      elsif v_validade_lote is distinct from p_validade then
        raise exception 'O lote % já existe com validade %.', v_codigo, to_char(v_validade_lote, 'DD/MM/YYYY');
      end if;
    end if;
  elsif not exists (select 1 from public.lotes l where l.id = v_lote and l.variacao_id = p_variacao) then
    raise exception 'Lote não encontrado.';
  end if;

  insert into public.saldos (lote_id, variacao_id) values (v_lote, p_variacao) on conflict do nothing;
  select s.quantidade into v_saldo from public.saldos s where s.lote_id = v_lote;

  insert into public.inventario_itens (inventario_id, variacao_id, lote_id, saldo_no_momento, quantidade_contada, contado_por)
  values (p_inventario, p_variacao, v_lote, v_saldo, p_quantidade, auth.uid())
  on conflict (inventario_id, lote_id) do update set
    saldo_no_momento = excluded.saldo_no_momento,
    quantidade_contada = excluded.quantidade_contada,
    contado_por = excluded.contado_por,
    contado_em = now()
  returning id into v_id;
  return v_id;
end;
$$;

-- As diferenças para o administrador decidir: saldo do momento, contado, diferença e o valor dela
-- (|diferença| × custo médio, como na R8; nulo sem custo médio).
create function public.revisao_inventario(p_inventario bigint)
returns table (
  lote_id uuid,
  produto text,
  variacao text,
  codigo_lote text,
  validade date,
  tipo_venda public.tipo_venda,
  saldo_no_momento bigint,
  contado bigint,
  diferenca bigint,
  valor_centavos bigint,
  contado_por text,
  contado_em timestamptz
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
  select i.lote_id, p.nome, v.nome, l.codigo, l.validade, p.tipo_venda, i.saldo_no_momento, i.quantidade_contada,
    i.quantidade_contada - i.saldo_no_momento,
    round(abs(i.quantidade_contada - i.saldo_no_momento) * c.custo_medio * 100)::bigint,
    u.nome, i.contado_em
  from public.inventario_itens i
  join public.lotes l on l.id = i.lote_id
  join public.variacoes v on v.id = i.variacao_id
  join public.produtos p on p.id = v.produto_id
  left join public.custos_variacao c on c.variacao_id = i.variacao_id
  left join public.usuarios u on u.id = i.contado_por
  where i.inventario_id = p_inventario
  order by p.nome, v.nome, l.validade nulls first, l.codigo;
end;
$$;

-- Números do inventário para todos (sem saldo): quanto foi contado e quando (critério 4: o tempo gasto).
create function public.resumo_inventario(p_inventario bigint)
returns table (
  itens_contados integer,
  com_diferenca integer,
  variacoes_no_escopo integer,
  variacoes_contadas integer,
  primeira_contagem timestamptz,
  ultima_contagem timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  return query
  select count(*)::integer,
    (count(*) filter (where i.quantidade_contada <> i.saldo_no_momento))::integer,
    (select count(*) from public.variacoes_do_inventario(p_inventario))::integer,
    (count(distinct i.variacao_id))::integer,
    min(i.contado_em), max(i.contado_em)
  from public.inventario_itens i
  where i.inventario_id = p_inventario;
end;
$$;

-- Aprova: cada item com diferença vira um ajuste_inventario de (contado − saldo do momento). Se algum
-- deixaria o saldo negativo (R1), nada é ajustado e a mensagem diz qual item.
create function public.aprovar_inventario(p_inventario bigint)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_saldo bigint;
  v_unidade text;
  v_ajustes integer := 0;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if (public.travar_inventario(p_inventario)).situacao <> 'em_revisao' then
    raise exception 'Este inventário não está mais em revisão.';
  end if;
  perform public.travar_saldos(array(
    select distinct i.variacao_id from public.inventario_itens i where i.inventario_id = p_inventario));

  for v_item in
    select i.lote_id, i.contado_por, i.quantidade_contada - i.saldo_no_momento as diferenca,
      l.codigo, v.nome as variacao, p.nome as produto, p.tipo_venda
    from public.inventario_itens i
    join public.lotes l on l.id = i.lote_id
    join public.variacoes v on v.id = i.variacao_id
    join public.produtos p on p.id = v.produto_id
    where i.inventario_id = p_inventario and i.quantidade_contada <> i.saldo_no_momento
    order by i.lote_id
  loop
    select coalesce(s.quantidade, 0) into v_saldo from public.saldos s where s.lote_id = v_item.lote_id;
    if coalesce(v_saldo, 0) + v_item.diferenca < 0 then
      v_unidade := case v_item.tipo_venda when 'peso' then 'g' else 'un' end;
      raise exception '% – % (lote %): o ajuste de % % deixaria o saldo negativo (há % % agora). Nada foi ajustado.',
        v_item.produto, v_item.variacao, v_item.codigo, v_item.diferenca, v_unidade, coalesce(v_saldo, 0), v_unidade;
    end if;
    perform public.movimentar_lote(
      v_item.lote_id, 'ajuste_inventario', v_item.diferenca, 'Inventário nº ' || p_inventario, v_item.contado_por,
      'inventario', p_inventario::text, null, auth.uid());
    v_ajustes := v_ajustes + 1;
  end loop;

  update public.inventarios set situacao = 'aprovado', decidido_por = auth.uid(), decidido_em = now()
  where id = p_inventario;
  return v_ajustes;
end;
$$;
