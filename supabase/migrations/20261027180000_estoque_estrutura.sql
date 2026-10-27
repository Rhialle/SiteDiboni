-- Estoque, parte 1: lotes, saldos, movimentações, custos, solicitações e conferências.
-- Quem entra no site não grava direto nestas tabelas: tudo passa pelas funções do estoque,
-- que aplicam as regras R1 a R10 da especificação.

create type public.tipo_movimentacao as enum (
  'entrada_nota', 'entrada_manual', 'ajuste_inventario', 'ajuste_manual',
  'perda_vencimento', 'perda_avaria', 'quebra_pesagem', 'estorno'
);

create type public.situacao_solicitacao as enum ('pendente', 'aprovada', 'recusada');

-- "Hoje" no fuso da loja: a validade vale até o fim do dia em São Paulo.
create function public.hoje_sp()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- ---------------------------------------------------------------------------
-- Lotes e saldos
-- ---------------------------------------------------------------------------

create table public.lotes (
  id uuid primary key default gen_random_uuid(),
  variacao_id uuid not null references public.variacoes (id),
  codigo text not null check (char_length(trim(codigo)) between 1 and 40),
  validade date,
  criado_em timestamptz not null default now(),
  constraint lotes_codigo_por_variacao unique (variacao_id, codigo)
);

-- Produto que controla validade: todo lote tem validade. Produto que não controla: um lote só, o GERAL.
create function public.lotes_combinam_com_produto()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_controla boolean;
begin
  select p.controla_validade into v_controla
  from public.produtos p join public.variacoes v on v.produto_id = p.id
  where v.id = new.variacao_id;

  if v_controla and new.validade is null then
    raise exception 'Informe a validade: este produto controla validade.';
  end if;
  if not v_controla and (new.codigo <> 'GERAL' or new.validade is not null) then
    raise exception 'Este produto não controla validade: o estoque fica num lote só.';
  end if;
  return new;
end;
$$;

create trigger lotes_combinam_com_produto
  before insert on public.lotes
  for each row execute function public.lotes_combinam_com_produto();

-- Cópia de leitura rápida da soma das movimentações de cada lote (R1: nunca negativa).
create table public.saldos (
  lote_id uuid primary key references public.lotes (id),
  variacao_id uuid not null references public.variacoes (id),
  quantidade bigint not null default 0,
  constraint saldos_nao_negativo check (quantidade >= 0)
);

create index saldos_por_variacao on public.saldos (variacao_id);

-- ---------------------------------------------------------------------------
-- Movimentações (nunca se alteram nem se apagam: um erro se corrige com estorno)
-- ---------------------------------------------------------------------------

create table public.movimentacoes (
  id bigint generated always as identity primary key,
  variacao_id uuid not null references public.variacoes (id),
  lote_id uuid not null references public.lotes (id),
  tipo public.tipo_movimentacao not null,
  -- Na unidade base: positiva quando entra, negativa quando sai.
  quantidade bigint not null check (quantidade <> 0),
  motivo text not null default '',
  origem text,
  origem_id text,
  estorno_de bigint references public.movimentacoes (id),
  -- Sem chave estrangeira, como em historico_cadastro.
  usuario_id uuid not null,
  aprovado_por uuid,
  criado_em timestamptz not null default now(),
  -- Cada movimentação é estornada uma vez só.
  constraint movimentacoes_estorno_de_key unique (estorno_de),
  constraint movimentacoes_sentido check (
    (case
      when tipo in ('entrada_nota', 'entrada_manual') then quantidade > 0
      when tipo in ('perda_vencimento', 'perda_avaria', 'quebra_pesagem') then quantidade < 0
      else true
    end)
    and (tipo = 'estorno') = (estorno_de is not null)
  )
);

create index movimentacoes_por_variacao on public.movimentacoes (variacao_id, criado_em desc);
create index movimentacoes_por_data on public.movimentacoes (criado_em desc);

create function public.movimentacoes_imutaveis()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Movimentações não podem ser alteradas nem apagadas. Use o estorno.';
end;
$$;

create trigger movimentacoes_imutaveis
  before update or delete on public.movimentacoes
  for each row execute function public.movimentacoes_imutaveis();

-- ---------------------------------------------------------------------------
-- Custos (só o administrador lê), solicitações e conferências
-- ---------------------------------------------------------------------------

create table public.movimentacoes_custos (
  movimentacao_id bigint primary key references public.movimentacoes (id),
  -- Reais por unidade base.
  custo_unitario numeric(14, 6) not null check (custo_unitario >= 0)
);

create table public.custos_variacao (
  variacao_id uuid primary key references public.variacoes (id),
  custo_medio numeric(14, 6) not null check (custo_medio >= 0),
  atualizado_em timestamptz not null default now()
);

create table public.solicitacoes_ajuste (
  id bigint generated always as identity primary key,
  variacao_id uuid not null references public.variacoes (id),
  lote_id uuid not null references public.lotes (id),
  tipo public.tipo_movimentacao not null
    check (tipo in ('ajuste_manual', 'perda_avaria', 'perda_vencimento', 'quebra_pesagem')),
  quantidade bigint not null check (quantidade <> 0),
  motivo text not null,
  solicitado_por uuid not null,
  solicitado_em timestamptz not null default now(),
  situacao public.situacao_solicitacao not null default 'pendente',
  decidido_por uuid,
  decidido_em timestamptz
);

create table public.verificacoes_integridade (
  id bigint generated always as identity primary key,
  executada_em timestamptz not null default now(),
  -- Lista de {variacao_id, lote_id, saldo, soma} em que o saldo difere da soma das movimentações.
  divergencias jsonb not null default '[]'
);

-- ---------------------------------------------------------------------------
-- Produto com estoque não muda a unidade base nem o controle de validade
-- ---------------------------------------------------------------------------

-- Por unidade a base é a unidade; por peso, o grama: trocar mudaria o sentido das quantidades.
create function public.produtos_tipo_venda_sem_movimentacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo_venda is distinct from old.tipo_venda and exists (
    select 1 from public.movimentacoes m join public.variacoes v on v.id = m.variacao_id
    where v.produto_id = new.id
  ) then
    raise exception 'Não dá para mudar o tipo de venda: o produto já tem movimentações de estoque.';
  end if;
  return new;
end;
$$;

create trigger produtos_tipo_venda_sem_movimentacao
  before update of tipo_venda on public.produtos
  for each row execute function public.produtos_tipo_venda_sem_movimentacao();

create function public.produtos_validade_sem_saldo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.controla_validade is distinct from old.controla_validade and exists (
    select 1 from public.saldos s join public.variacoes v on v.id = s.variacao_id
    where v.produto_id = new.id and s.quantidade > 0
  ) then
    raise exception 'Não dá para mudar o controle de validade: o produto tem estoque.';
  end if;
  return new;
end;
$$;

create trigger produtos_validade_sem_saldo
  before update of controla_validade on public.produtos
  for each row execute function public.produtos_validade_sem_saldo();

-- ---------------------------------------------------------------------------
-- Funções internas, usadas pelas funções do estoque (não ficam liberadas para quem entra no site)
-- ---------------------------------------------------------------------------

-- R10: trava as linhas de saldo das variações sempre na mesma ordem (por lote), para duas operações
-- nunca ficarem esperando uma pela outra para sempre.
create function public.travar_saldos(p_variacoes uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.saldos where variacao_id = any (p_variacoes) order by lote_id for update;
end;
$$;

-- O lote GERAL da variação (produto sem controle de validade), criado com saldo zero na primeira vez.
create function public.lote_geral(p_variacao uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lote uuid;
begin
  select id into v_lote from public.lotes where variacao_id = p_variacao and codigo = 'GERAL';
  if v_lote is null then
    insert into public.lotes (variacao_id, codigo) values (p_variacao, 'GERAL')
    on conflict (variacao_id, codigo) do nothing
    returning id into v_lote;
    -- Outra transação criou o mesmo lote ao mesmo tempo.
    if v_lote is null then
      select id into v_lote from public.lotes where variacao_id = p_variacao and codigo = 'GERAL';
    end if;
  end if;
  insert into public.saldos (lote_id, variacao_id) values (v_lote, p_variacao) on conflict do nothing;
  return v_lote;
end;
$$;

-- R7: {prefixo}-AAAA-MM-DD com a data de hoje; se já existir na variação, -2, -3 e assim por diante.
create function public.gerar_codigo_lote(p_variacao uuid, p_prefixo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text := p_prefixo || '-' || to_char(public.hoje_sp(), 'YYYY-MM-DD');
  v_codigo text := v_base;
  v_numero integer := 1;
begin
  while exists (select 1 from public.lotes where variacao_id = p_variacao and codigo = v_codigo) loop
    v_numero := v_numero + 1;
    v_codigo := v_base || '-' || v_numero;
  end loop;
  return v_codigo;
end;
$$;

-- Muda o saldo de um lote e registra a movimentação, na mesma transação. Aplica R1 (saldo nunca
-- negativo) e R4 (lote vencido só sai como perda por vencimento; estorno e inventário são correções).
create function public.movimentar_lote(
  p_lote uuid,
  p_tipo public.tipo_movimentacao,
  p_quantidade bigint,
  p_motivo text,
  p_usuario uuid,
  p_origem text default null,
  p_origem_id text default null,
  p_estorno_de bigint default null,
  p_aprovado_por uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_variacao uuid;
  v_validade date;
  v_unidade text;
  v_saldo bigint;
  v_id bigint;
begin
  select l.variacao_id, l.validade, case p.tipo_venda when 'peso' then 'g' else 'un' end
  into v_variacao, v_validade, v_unidade
  from public.lotes l
  join public.variacoes v on v.id = l.variacao_id
  join public.produtos p on p.id = v.produto_id
  where l.id = p_lote;
  if v_variacao is null then
    raise exception 'Lote não encontrado.';
  end if;

  insert into public.saldos (lote_id, variacao_id) values (p_lote, v_variacao) on conflict do nothing;
  select quantidade into v_saldo from public.saldos where lote_id = p_lote for update;

  if p_quantidade < 0 and v_validade < public.hoje_sp()
     and p_tipo not in ('perda_vencimento', 'estorno', 'ajuste_inventario') then
    raise exception 'Lote vencido só sai como perda por vencimento.';
  end if;
  if v_saldo + p_quantidade < 0 then
    raise exception 'Saldo insuficiente: há % % neste lote.', v_saldo, v_unidade;
  end if;

  update public.saldos set quantidade = quantidade + p_quantidade where lote_id = p_lote;
  insert into public.movimentacoes
    (variacao_id, lote_id, tipo, quantidade, motivo, origem, origem_id, estorno_de, usuario_id, aprovado_por)
  values
    (v_variacao, p_lote, p_tipo, p_quantidade, coalesce(trim(p_motivo), ''), p_origem, p_origem_id,
     p_estorno_de, p_usuario, p_aprovado_por)
  returning id into v_id;
  return v_id;
end;
$$;

-- O Supabase libera "execute" para anon e authenticated por padrão; o service_role continua podendo
-- (os testes de tela usam isso para preparar estoque).
revoke execute on function public.travar_saldos(uuid[]) from public, anon, authenticated;
revoke execute on function public.lote_geral(uuid) from public, anon, authenticated;
revoke execute on function public.gerar_codigo_lote(uuid, text) from public, anon, authenticated;
revoke execute on function public.movimentar_lote(
  uuid, public.tipo_movimentacao, bigint, text, uuid, text, text, bigint, uuid
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Permissões: todos os usuários ativos leem o estoque (sem custo); ninguém grava direto
-- ---------------------------------------------------------------------------

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'lotes', 'saldos', 'movimentacoes', 'movimentacoes_custos', 'custos_variacao',
    'solicitacoes_ajuste', 'verificacoes_integridade'
  ] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on public.%I from anon', tabela);
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', tabela);
  end loop;

  foreach tabela in array array['lotes', 'saldos', 'movimentacoes'] loop
    execute format(
      'create policy "%1$s: leitura por usuário ativo" on public.%1$I for select to authenticated using (public.eh_usuario_ativo())',
      tabela);
  end loop;

  foreach tabela in array array['movimentacoes_custos', 'custos_variacao', 'verificacoes_integridade'] loop
    execute format(
      'create policy "%1$s: leitura pelo administrador" on public.%1$I for select to authenticated using (public.eh_administrador())',
      tabela);
  end loop;
end;
$$;

create policy "solicitacoes_ajuste: administrador lê todas, funcionária as dela"
  on public.solicitacoes_ajuste for select to authenticated
  using (public.eh_administrador() or (public.eh_usuario_ativo() and solicitado_por = auth.uid()));
