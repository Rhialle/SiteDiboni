-- Balcão (fase 2.1): o caixa. Um caixa aberto por vez, aberto com o troco da gaveta; retiradas e
-- reforços de dinheiro durante o dia; fechamento às cegas (quem fecha informa o contado antes de ver
-- o esperado); o administrador confere os fechamentos com diferença.

alter table public.configuracoes
  add column limite_desconto_percentual integer not null default 10
    check (limite_desconto_percentual between 0 and 100),
  add column largura_cupom_mm integer not null default 80
    check (largura_cupom_mm in (58, 80));

create table public.caixas (
  id bigint generated always as identity primary key,
  situacao public.situacao_caixa not null default 'aberto',
  aberto_por uuid not null,
  aberto_em timestamptz not null default now(),
  troco_inicial_centavos integer not null check (troco_inicial_centavos >= 0),
  fechado_por uuid,
  fechado_em timestamptz,
  esperado_dinheiro_centavos integer,
  informado_dinheiro_centavos integer,
  esperado_credito_centavos integer,
  informado_credito_centavos integer,
  esperado_debito_centavos integer,
  informado_debito_centavos integer,
  esperado_pix_centavos integer,
  informado_pix_centavos integer,
  conferido_por uuid,
  conferido_em timestamptz,
  check ((situacao = 'fechado') = (fechado_em is not null))
);

-- Um caixa aberto por vez.
create unique index caixas_um_aberto on public.caixas (situacao) where situacao = 'aberto';

create table public.caixa_movimentos (
  id bigint generated always as identity primary key,
  caixa_id bigint not null references public.caixas (id),
  tipo public.tipo_movimento_caixa not null,
  valor_centavos integer not null check (valor_centavos > 0),
  motivo text not null check (trim(motivo) <> ''),
  usuario_id uuid not null,
  em timestamptz not null default now()
);

create index caixa_movimentos_caixa on public.caixa_movimentos (caixa_id);

alter table public.caixas enable row level security;
alter table public.caixa_movimentos enable row level security;

-- As tabelas guardam o esperado: só o administrador lê. Quem vende usa as funções abaixo.
create policy "caixas: leitura pelo administrador"
  on public.caixas for select to authenticated using (public.eh_administrador());
create policy "caixa_movimentos: leitura pelo administrador"
  on public.caixa_movimentos for select to authenticated using (public.eh_administrador());
revoke insert, update, delete, truncate on public.caixas, public.caixa_movimentos from authenticated;
revoke all on public.caixas, public.caixa_movimentos from anon;

-- O caixa aberto, travado para quem vai mexer nele. Sem caixa aberto, erro.
create function public.travar_caixa_aberto()
returns public.caixas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caixa public.caixas;
begin
  select * into v_caixa from public.caixas where situacao = 'aberto' for update;
  if not found then
    raise exception 'Não há caixa aberto.';
  end if;
  return v_caixa;
end;
$$;

create function public.abrir_caixa(p_troco_inicial_centavos integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if p_troco_inicial_centavos is null or p_troco_inicial_centavos < 0 then
    raise exception 'O troco inicial não pode ser negativo.';
  end if;
  if exists (select 1 from public.caixas where situacao = 'aberto') then
    raise exception 'Já existe um caixa aberto.';
  end if;
  insert into public.caixas (aberto_por, troco_inicial_centavos)
  values (auth.uid(), p_troco_inicial_centavos)
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    -- Dois "abrir" ao mesmo tempo: o índice segura o segundo.
    raise exception 'Já existe um caixa aberto.';
end;
$$;

create function public.registrar_movimento_caixa(
  p_tipo public.tipo_movimento_caixa,
  p_valor_centavos integer,
  p_motivo text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caixa public.caixas;
  v_id bigint;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if p_valor_centavos is null or p_valor_centavos <= 0 then
    raise exception 'Informe um valor maior que zero.';
  end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Informe o motivo.';
  end if;
  v_caixa := public.travar_caixa_aberto();
  insert into public.caixa_movimentos (caixa_id, tipo, valor_centavos, motivo, usuario_id)
  values (v_caixa.id, p_tipo, p_valor_centavos, trim(p_motivo), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- O caixa aberto para quem vende: sem o esperado (o fechamento é às cegas).
create function public.caixa_aberto()
returns table (
  id bigint,
  aberto_em timestamptz,
  aberto_por text,
  troco_inicial_centavos integer,
  vendas integer,
  movimentos jsonb
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
  select c.id, c.aberto_em, u.nome, c.troco_inicial_centavos, public.vendas_do_caixa(c.id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'tipo', m.tipo, 'valor_centavos', m.valor_centavos, 'motivo', m.motivo, 'em', m.em) order by m.id)
      from public.caixa_movimentos m where m.caixa_id = c.id
    ), '[]'::jsonb)
  from public.caixas c
  left join public.usuarios u on u.id = c.aberto_por
  where c.situacao = 'aberto';
end;
$$;

-- Quantas vendas o caixa tem. Até existir a venda (2.1, parte da venda), zero.
create function public.vendas_do_caixa(p_caixa bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select 0
$$;

-- O esperado de cada forma de pagamento. Até existir a venda, só o dinheiro: troco + reforços −
-- retiradas. A parte da venda recria esta função somando as vendas do caixa.
create function public.esperado_do_caixa(p_caixa bigint)
returns table (forma public.forma_pagamento, esperado_centavos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select 'dinheiro'::public.forma_pagamento,
    (c.troco_inicial_centavos
      + coalesce((select sum(valor_centavos) from public.caixa_movimentos where caixa_id = c.id and tipo = 'reforco'), 0)
      - coalesce((select sum(valor_centavos) from public.caixa_movimentos where caixa_id = c.id and tipo = 'retirada'), 0)
    )::integer
  from public.caixas c where c.id = p_caixa
  union all
  select f, 0 from unnest(array['cartao_credito', 'cartao_debito', 'pix']::public.forma_pagamento[]) as f
$$;

-- O resumo de um caixa fechado, a partir do que ficou gravado no fechamento.
create function public.linhas_do_fechamento(p_caixa public.caixas)
returns table (
  forma public.forma_pagamento,
  esperado_centavos integer,
  informado_centavos integer,
  diferenca_centavos integer
)
language sql
immutable
set search_path = ''
as $$
  select f.forma, f.esperado, f.informado, f.informado - f.esperado
  from (values
    ('dinheiro'::public.forma_pagamento, 1, p_caixa.esperado_dinheiro_centavos, p_caixa.informado_dinheiro_centavos),
    ('cartao_credito', 2, p_caixa.esperado_credito_centavos, p_caixa.informado_credito_centavos),
    ('cartao_debito', 3, p_caixa.esperado_debito_centavos, p_caixa.informado_debito_centavos),
    ('pix', 4, p_caixa.esperado_pix_centavos, p_caixa.informado_pix_centavos)
  ) as f (forma, ordem, esperado, informado)
  order by f.ordem
$$;

create function public.fechar_caixa(
  p_dinheiro_centavos integer,
  p_credito_centavos integer default null,
  p_debito_centavos integer default null,
  p_pix_centavos integer default null
)
returns table (
  forma public.forma_pagamento,
  esperado_centavos integer,
  informado_centavos integer,
  diferenca_centavos integer
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_caixa public.caixas;
  v_esperado jsonb;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  v_caixa := public.travar_caixa_aberto();
  if p_dinheiro_centavos is null then
    raise exception 'Informe o dinheiro contado na gaveta.';
  end if;
  if p_dinheiro_centavos < 0 or p_credito_centavos < 0 or p_debito_centavos < 0 or p_pix_centavos < 0 then
    raise exception 'Os valores informados não podem ser negativos.';
  end if;

  select jsonb_object_agg(e.forma, e.esperado_centavos) into v_esperado from public.esperado_do_caixa(v_caixa.id) e;

  update public.caixas set
    situacao = 'fechado',
    fechado_por = auth.uid(),
    fechado_em = now(),
    esperado_dinheiro_centavos = (v_esperado ->> 'dinheiro')::integer,
    informado_dinheiro_centavos = p_dinheiro_centavos,
    esperado_credito_centavos = (v_esperado ->> 'cartao_credito')::integer,
    informado_credito_centavos = p_credito_centavos,
    esperado_debito_centavos = (v_esperado ->> 'cartao_debito')::integer,
    informado_debito_centavos = p_debito_centavos,
    esperado_pix_centavos = (v_esperado ->> 'pix')::integer,
    informado_pix_centavos = p_pix_centavos
  where id = v_caixa.id
  returning * into v_caixa;

  return query select * from public.linhas_do_fechamento(v_caixa);
end;
$$;

-- O resumo de um fechamento: o administrador vê qualquer um; os outros, só os que eles fecharam.
-- Um caixa que a pessoa não pode ver responde como "não encontrado".
create function public.resumo_fechamento(p_caixa bigint)
returns table (
  forma public.forma_pagamento,
  esperado_centavos integer,
  informado_centavos integer,
  diferenca_centavos integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caixa public.caixas;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  select * into v_caixa from public.caixas c
  where c.id = p_caixa and c.situacao = 'fechado'
    and (public.eh_administrador() or c.fechado_por = auth.uid());
  if not found then
    raise exception 'Caixa não encontrado.';
  end if;
  return query select * from public.linhas_do_fechamento(v_caixa);
end;
$$;

create function public.caixas_fechados()
returns table (
  id bigint,
  aberto_em timestamptz,
  fechado_em timestamptz,
  fechado_por text,
  diferenca_dinheiro_centavos integer,
  com_diferenca boolean,
  conferido boolean
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
  select c.id, c.aberto_em, c.fechado_em, u.nome,
    c.informado_dinheiro_centavos - c.esperado_dinheiro_centavos,
    exists (select 1 from public.linhas_do_fechamento(c) l where l.diferenca_centavos <> 0),
    c.conferido_em is not null
  from public.caixas c
  left join public.usuarios u on u.id = c.fechado_por
  where c.situacao = 'fechado' and (public.eh_administrador() or c.fechado_por = auth.uid())
  order by c.fechado_em desc, c.id desc
  limit 100;
end;
$$;

create function public.conferir_caixa(p_caixa bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  update public.caixas set conferido_por = auth.uid(), conferido_em = now()
  where id = p_caixa and situacao = 'fechado' and conferido_em is null;
  if not found then
    raise exception 'Caixa não encontrado.';
  end if;
end;
$$;

revoke execute on function public.travar_caixa_aberto() from public, anon, authenticated;
revoke execute on function public.vendas_do_caixa(bigint) from public, anon, authenticated;
revoke execute on function public.esperado_do_caixa(bigint) from public, anon, authenticated;
revoke execute on function public.linhas_do_fechamento(public.caixas) from public, anon, authenticated;
