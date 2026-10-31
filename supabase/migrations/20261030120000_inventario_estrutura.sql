-- Inventário, parte 1: estrutura, abertura com escopo, um em andamento por vez e as situações
-- (seção 7, "Inventário"). As colunas de usuário não têm chave estrangeira, como nas notas: os testes
-- apagam os usuários antes do estoque.

create type public.situacao_inventario as enum ('aberto', 'em_revisao', 'aprovado', 'cancelado');
create type public.escopo_inventario as enum ('loja', 'categorias', 'variacoes');

create table public.inventarios (
  id bigint generated always as identity primary key,
  descricao text not null check (char_length(trim(descricao)) between 1 and 120),
  escopo public.escopo_inventario not null,
  situacao public.situacao_inventario not null default 'aberto',
  aberto_por uuid not null,
  aberto_em timestamptz not null default now(),
  encerrado_em timestamptz,
  decidido_por uuid,
  decidido_em timestamptz
);

-- Só um inventário em contagem ou em revisão: dois nunca ajustam o mesmo item.
create unique index inventarios_um_em_andamento on public.inventarios ((true)) where situacao in ('aberto', 'em_revisao');

create table public.inventario_escopo (
  inventario_id bigint not null references public.inventarios (id),
  categoria_id uuid references public.categorias (id),
  variacao_id uuid references public.variacoes (id),
  check (num_nonnulls(categoria_id, variacao_id) = 1)
);
create index inventario_escopo_por_inventario on public.inventario_escopo (inventario_id);

-- Um item por lote: contar de novo substitui. O saldo do momento fica gravado para o ajuste.
create table public.inventario_itens (
  id bigint generated always as identity primary key,
  inventario_id bigint not null references public.inventarios (id),
  variacao_id uuid not null references public.variacoes (id),
  lote_id uuid not null references public.lotes (id),
  saldo_no_momento bigint not null,
  quantidade_contada bigint not null check (quantidade_contada >= 0),
  contado_por uuid not null,
  contado_em timestamptz not null default now(),
  constraint inventario_itens_lote_key unique (inventario_id, lote_id)
);

alter table public.inventarios enable row level security;
alter table public.inventario_escopo enable row level security;
alter table public.inventario_itens enable row level security;
create policy "inventarios: leitura por usuário ativo" on public.inventarios
  for select to authenticated using (public.eh_usuario_ativo());
create policy "inventario_escopo: leitura por usuário ativo" on public.inventario_escopo
  for select to authenticated using (public.eh_usuario_ativo());
-- Os itens guardam o saldo do momento: só o administrador lê (contagem às cegas). Quem conta usa as funções.
create policy "inventario_itens: leitura pelo administrador" on public.inventario_itens
  for select to authenticated using (public.eh_administrador());
revoke insert, update, delete, truncate on public.inventarios, public.inventario_escopo, public.inventario_itens
  from anon, authenticated;

-- As variações do escopo: a loja inteira, as categorias com as subcategorias, ou a lista.
create function public.variacoes_do_inventario(p_inventario bigint)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with recursive categorias_do_escopo (id) as (
    select e.categoria_id from public.inventario_escopo e where e.inventario_id = p_inventario and e.categoria_id is not null
    union
    select c.id from public.categorias c join categorias_do_escopo k on c.categoria_pai_id = k.id
  )
  select v.id from public.variacoes v
  where exists (select 1 from public.inventarios i where i.id = p_inventario and i.escopo = 'loja')
  union
  select v.id from public.variacoes v join public.produto_categorias pc on pc.produto_id = v.produto_id
  where pc.categoria_id in (select id from categorias_do_escopo)
  union
  select e.variacao_id from public.inventario_escopo e where e.inventario_id = p_inventario and e.variacao_id is not null
$$;

revoke execute on function public.variacoes_do_inventario(bigint) from public, anon, authenticated;

create function public.abrir_inventario(
  p_descricao text,
  p_escopo public.escopo_inventario,
  p_categorias uuid[],
  p_codigos text[]
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_codigos text[];
  v_faltando text;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if exists (select 1 from public.inventarios where situacao in ('aberto', 'em_revisao')) then
    raise exception 'Já existe um inventário em andamento: termine ou cancele antes de abrir outro.';
  end if;
  if p_escopo = 'categorias' and coalesce(cardinality(p_categorias), 0) = 0 then
    raise exception 'Escolha pelo menos uma categoria.';
  end if;
  v_codigos := array(
    select distinct public.normalizar_codigo_interno(c) from unnest(coalesce(p_codigos, '{}')) c where trim(c) <> '');
  if p_escopo = 'variacoes' then
    if cardinality(v_codigos) = 0 then
      raise exception 'Informe pelo menos um código interno.';
    end if;
    select string_agg(c, ', ' order by c) into v_faltando
    from unnest(v_codigos) c
    where not exists (select 1 from public.variacoes v where v.codigo_interno = c);
    if v_faltando is not null then
      raise exception 'Código interno não encontrado: %.', v_faltando;
    end if;
  end if;

  insert into public.inventarios (descricao, escopo, aberto_por)
  values (
    coalesce(nullif(trim(p_descricao), ''), 'Inventário de ' || to_char(public.hoje_sp(), 'DD/MM/YYYY')),
    p_escopo, auth.uid())
  returning id into v_id;

  if p_escopo = 'categorias' then
    insert into public.inventario_escopo (inventario_id, categoria_id)
    select distinct v_id, c from unnest(p_categorias) c;
  elsif p_escopo = 'variacoes' then
    insert into public.inventario_escopo (inventario_id, variacao_id)
    select v_id, v.id from public.variacoes v where v.codigo_interno = any (v_codigos);
  end if;
  return v_id;
end;
$$;

-- Trava a linha do inventário até o fim da transação: encerrar, voltar a contar, aprovar e cancelar
-- esperam uma pela outra, e a contagem (que trava com FOR SHARE) espera por elas.
create function public.travar_inventario(p_inventario bigint)
returns public.inventarios
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inventario public.inventarios;
begin
  select * into v_inventario from public.inventarios where id = p_inventario for update;
  if not found then
    raise exception 'Inventário não encontrado.';
  end if;
  return v_inventario;
end;
$$;

revoke execute on function public.travar_inventario(bigint) from public, anon, authenticated;

create function public.encerrar_contagem(p_inventario bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if (public.travar_inventario(p_inventario)).situacao <> 'aberto' then
    raise exception 'Este inventário não está mais em contagem.';
  end if;
  update public.inventarios set situacao = 'em_revisao', encerrado_em = now() where id = p_inventario;
end;
$$;

create function public.reabrir_contagem(p_inventario bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if (public.travar_inventario(p_inventario)).situacao <> 'em_revisao' then
    raise exception 'Este inventário não está mais em revisão.';
  end if;
  update public.inventarios set situacao = 'aberto', encerrado_em = null where id = p_inventario;
end;
$$;

create function public.cancelar_inventario(p_inventario bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if (public.travar_inventario(p_inventario)).situacao not in ('aberto', 'em_revisao') then
    raise exception 'Este inventário já foi aprovado ou cancelado.';
  end if;
  update public.inventarios set situacao = 'cancelado', decidido_por = auth.uid(), decidido_em = now()
  where id = p_inventario;
end;
$$;
