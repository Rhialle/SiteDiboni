-- Catálogo, parte 1: produtos, variações, categorias e materiais.

create type public.tipo_venda as enum ('unidade', 'peso');

-- Código de barras GTIN (EAN-8, UPC-A, EAN-13 ou GTIN-14): dígito verificador módulo 10,
-- com pesos 3 e 1 alternados a partir da direita.
create function public.gtin_valido(codigo text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  soma int := 0;
  n int;
begin
  if codigo is null or codigo !~ '^(\d{8}|\d{12}|\d{13}|\d{14})$' then
    return false;
  end if;
  n := length(codigo);
  for i in 1..n - 1 loop
    soma := soma + substr(codigo, n - i, 1)::int * case when i % 2 = 1 then 3 else 1 end;
  end loop;
  return (10 - soma % 10) % 10 = substr(codigo, n, 1)::int;
end;
$$;

-- ---------------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------------

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 160),
  descricao text not null default '',
  tipo_venda public.tipo_venda not null,
  controla_validade boolean not null default false,
  ncm text check (ncm ~ '^\d{8}$'),
  cest text check (cest ~ '^\d{7}$'),
  origem_fiscal smallint check (origem_fiscal between 0 and 8),
  apto_forno boolean not null default false,
  apto_freezer boolean not null default false,
  apto_microondas boolean not null default false,
  apto_alimento boolean not null default false,
  -- Só esta escolha é gravada; incompleto ou ativo é calculado (view produtos_com_situacao).
  inativo boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger tocar_atualizado_em
  before update on public.produtos
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Categorias (com subcategorias) e materiais
-- ---------------------------------------------------------------------------

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  categoria_pai_id uuid references public.categorias (id) on delete restrict,
  ordem integer not null default 0
);

create unique index categorias_nome_por_pai
  on public.categorias (categoria_pai_id, lower(nome)) nulls not distinct;

create function public.categorias_sem_ciclo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Sobe a partir do novo pai: se chegar na própria categoria, haveria um ciclo.
  if new.categoria_pai_id is not null and exists (
    with recursive acima as (
      select id, categoria_pai_id from public.categorias where id = new.categoria_pai_id
      union all
      select c.id, c.categoria_pai_id from public.categorias c join acima a on c.id = a.categoria_pai_id
    )
    select 1 from acima where id = new.id
  ) then
    raise exception 'Uma categoria não pode ficar dentro dela mesma.';
  end if;
  return new;
end;
$$;

create trigger categorias_sem_ciclo
  before insert or update of categoria_pai_id on public.categorias
  for each row execute function public.categorias_sem_ciclo();

create table public.produto_categorias (
  produto_id uuid not null references public.produtos (id),
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  primary key (produto_id, categoria_id)
);

create table public.etiquetas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 60)
);

create unique index etiquetas_nome_key on public.etiquetas (lower(nome));

create table public.produto_etiquetas (
  produto_id uuid not null references public.produtos (id),
  etiqueta_id uuid not null references public.etiquetas (id) on delete restrict,
  primary key (produto_id, etiqueta_id)
);

-- ---------------------------------------------------------------------------
-- Variações (o item que tem estoque e código)
-- ---------------------------------------------------------------------------

create sequence public.seq_codigo_interno;
grant usage, select on sequence public.seq_codigo_interno to authenticated;

-- Próximo código no formato P000001, pulando os que já foram digitados à mão.
create function public.proximo_codigo_interno()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  codigo text;
begin
  loop
    codigo := 'P' || lpad(nextval('public.seq_codigo_interno')::text, 6, '0');
    exit when not exists (select 1 from public.variacoes where codigo_interno = codigo);
  end loop;
  return codigo;
end;
$$;

create table public.variacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id),
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  codigo_interno text not null default public.proximo_codigo_interno()
    constraint variacoes_codigo_interno_key unique
    check (char_length(trim(codigo_interno)) between 1 and 30),
  codigo_barras text
    constraint variacoes_codigo_barras_key unique
    check (codigo_barras is null or public.gtin_valido(codigo_barras)),
  atributos jsonb not null default '{}' check (jsonb_typeof(atributos) = 'object'),
  comprimento_mm integer check (comprimento_mm > 0),
  largura_mm integer check (largura_mm > 0),
  altura_mm integer check (altura_mm > 0),
  capacidade_ml integer check (capacidade_ml > 0),
  estoque_minimo bigint not null default 0 check (estoque_minimo >= 0),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Produto e primeira variação nascem juntos: todo produto tem pelo menos uma variação.
create function public.criar_produto(dados jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  novo uuid;
  variacao jsonb := coalesce(dados -> 'variacao', '{}');
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;

  insert into public.produtos (
    nome, descricao, tipo_venda, controla_validade, ncm, cest, origem_fiscal,
    apto_forno, apto_freezer, apto_microondas, apto_alimento
  ) values (
    trim(dados ->> 'nome'),
    coalesce(dados ->> 'descricao', ''),
    (dados ->> 'tipo_venda')::public.tipo_venda,
    coalesce((dados ->> 'controla_validade')::boolean, false),
    nullif(dados ->> 'ncm', ''),
    nullif(dados ->> 'cest', ''),
    nullif(dados ->> 'origem_fiscal', '')::smallint,
    coalesce((dados ->> 'apto_forno')::boolean, false),
    coalesce((dados ->> 'apto_freezer')::boolean, false),
    coalesce((dados ->> 'apto_microondas')::boolean, false),
    coalesce((dados ->> 'apto_alimento')::boolean, false)
  )
  returning id into novo;

  insert into public.variacoes (produto_id, nome, codigo_interno, codigo_barras)
  values (
    novo,
    coalesce(nullif(trim(variacao ->> 'nome'), ''), 'Padrão'),
    coalesce(nullif(trim(variacao ->> 'codigo_interno'), ''), public.proximo_codigo_interno()),
    nullif(trim(variacao ->> 'codigo_barras'), '')
  );

  insert into public.produto_categorias (produto_id, categoria_id)
  select novo, valor::uuid from jsonb_array_elements_text(coalesce(dados -> 'categorias', '[]')) as valor;

  insert into public.produto_etiquetas (produto_id, etiqueta_id)
  select novo, valor::uuid from jsonb_array_elements_text(coalesce(dados -> 'etiquetas', '[]')) as valor;

  return novo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Histórico e permissões
-- ---------------------------------------------------------------------------

create trigger registrar_historico
  after insert or update or delete on public.produtos
  for each row execute function public.registrar_historico();

create trigger registrar_historico
  after insert or update or delete on public.variacoes
  for each row execute function public.registrar_historico();

create trigger registrar_historico
  after insert or update or delete on public.categorias
  for each row execute function public.registrar_historico();

-- Todos os usuários ativos leem o catálogo; só o administrador (com duas etapas) grava.
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'produtos', 'categorias', 'produto_categorias', 'etiquetas', 'produto_etiquetas', 'variacoes'
  ] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format(
      'create policy "%1$s: leitura por usuário ativo" on public.%1$I for select to authenticated using (public.eh_usuario_ativo())',
      tabela);
    execute format(
      'create policy "%1$s: inclusão pelo administrador" on public.%1$I for insert to authenticated with check (public.eh_administrador())',
      tabela);
    execute format(
      'create policy "%1$s: alteração pelo administrador" on public.%1$I for update to authenticated using (public.eh_administrador()) with check (public.eh_administrador())',
      tabela);
    execute format(
      'create policy "%1$s: exclusão pelo administrador" on public.%1$I for delete to authenticated using (public.eh_administrador())',
      tabela);
  end loop;
end;
$$;

-- Produtos e variações não se apagam (o estoque vai apontar para eles): são inativados.
revoke delete on public.produtos, public.variacoes from authenticated;
