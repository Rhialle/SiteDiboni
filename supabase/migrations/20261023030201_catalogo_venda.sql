-- Catálogo, parte 2: formas de venda, faixas de preço, compatibilidades, fotos e situação do produto.

-- ---------------------------------------------------------------------------
-- Formas de venda (como a variação sai da loja)
-- ---------------------------------------------------------------------------

create table public.formas_venda (
  id uuid primary key default gen_random_uuid(),
  variacao_id uuid not null references public.variacoes (id),
  nome text not null check (char_length(trim(nome)) between 1 and 60),
  -- Unidades base por forma (unidades ou gramas): "Pacote com 100" = 100; granel = 1000 (preço por kg).
  fator bigint not null check (fator > 0),
  preco_centavos integer not null check (preco_centavos >= 0),
  peso_variavel boolean not null default false,
  ativa boolean not null default true,
  check (not peso_variavel or fator = 1000)
);

create unique index formas_venda_um_granel on public.formas_venda (variacao_id) where peso_variavel;

create function public.formas_venda_combinam_com_produto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.peso_variavel and (
    select p.tipo_venda from public.produtos p join public.variacoes v on v.produto_id = p.id
    where v.id = new.variacao_id
  ) <> 'peso' then
    raise exception 'Só produto vendido por peso tem forma a granel.';
  end if;
  return new;
end;
$$;

create trigger formas_venda_combinam_com_produto
  before insert or update of peso_variavel, variacao_id on public.formas_venda
  for each row execute function public.formas_venda_combinam_com_produto();

-- Por peso só vende a granel (as porções fixas chegam na fase 3); por unidade nunca a granel.
create function public.tipo_venda_combina_com_formas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo_venda is distinct from old.tipo_venda and exists (
    select 1 from public.formas_venda f join public.variacoes v on v.id = f.variacao_id
    where v.produto_id = new.id
      and case when new.tipo_venda = 'peso' then not f.peso_variavel else f.peso_variavel end
  ) then
    raise exception 'Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele.';
  end if;
  return new;
end;
$$;

create trigger tipo_venda_combina_com_formas
  before update of tipo_venda on public.produtos
  for each row execute function public.tipo_venda_combina_com_formas();

-- ---------------------------------------------------------------------------
-- Faixas de preço por quantidade
-- ---------------------------------------------------------------------------

create table public.faixas_preco (
  id uuid primary key default gen_random_uuid(),
  forma_venda_id uuid not null references public.formas_venda (id) on delete cascade,
  -- Contada em número de formas (ex.: a partir de 10 pacotes).
  quantidade_minima integer not null check (quantidade_minima >= 2),
  preco_centavos integer not null check (preco_centavos >= 0),
  constraint faixas_preco_quantidade_key unique (forma_venda_id, quantidade_minima)
);

-- Conferido no fim da transação, para um reajuste em massa poder mexer em forma e faixas juntas.
create function public.conferir_faixas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_forma uuid;
  v_preco integer;
  v_granel boolean;
  anterior integer;
  faixa record;
begin
  -- Em IFs separados: no gatilho de formas_venda, "new" não tem forma_venda_id.
  if tg_table_name = 'faixas_preco' then
    v_forma := new.forma_venda_id;
  else
    v_forma := new.id;
  end if;

  select preco_centavos, peso_variavel into v_preco, v_granel from public.formas_venda where id = v_forma;
  if not found then
    return null;
  end if;

  if v_granel and exists (select 1 from public.faixas_preco where forma_venda_id = v_forma) then
    raise exception 'Forma a granel não tem faixas de preço.';
  end if;

  anterior := v_preco;
  for faixa in
    select preco_centavos from public.faixas_preco where forma_venda_id = v_forma order by quantidade_minima
  loop
    if faixa.preco_centavos >= anterior then
      raise exception 'O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.';
    end if;
    anterior := faixa.preco_centavos;
  end loop;
  return null;
end;
$$;

create constraint trigger faixas_em_ordem
  after insert or update on public.faixas_preco
  deferrable initially deferred
  for each row execute function public.conferir_faixas();

create constraint trigger faixas_em_ordem
  after update of preco_centavos, peso_variavel on public.formas_venda
  deferrable initially deferred
  for each row execute function public.conferir_faixas();

-- ---------------------------------------------------------------------------
-- Compatibilidades ("esta tampa serve neste pote") e fotos
-- ---------------------------------------------------------------------------

create table public.compatibilidades (
  id uuid primary key default gen_random_uuid(),
  variacao_a_id uuid not null references public.variacoes (id),
  variacao_b_id uuid not null references public.variacoes (id),
  descricao text not null default '',
  check (variacao_a_id <> variacao_b_id)
);

-- Vale nos dois sentidos: (a, b) e (b, a) são o mesmo par.
create unique index compatibilidades_par_key on public.compatibilidades (
  least(variacao_a_id, variacao_b_id), greatest(variacao_a_id, variacao_b_id)
);

create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id),
  variacao_id uuid references public.variacoes (id),
  -- Caminho no bucket fotos-produtos: <produto_id>/<arquivo>.
  caminho text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Situação calculada: ativo quando o cadastro está completo, inativo quando o administrador escolhe
-- ---------------------------------------------------------------------------

create view public.produtos_com_situacao
with (security_invoker = true)
as
select
  p.*,
  case
    when p.inativo then 'inativo'
    when cardinality(pendencia.itens) = 0 then 'ativo'
    else 'incompleto'
  end as situacao,
  pendencia.itens as pendencias
from public.produtos p
cross join lateral (
  select array_remove(array[
    case when not exists (
      select 1 from public.variacoes v join public.formas_venda f on f.variacao_id = v.id
      where v.produto_id = p.id and v.ativa and f.ativa
    ) then 'variação ativa com forma de venda' end,
    case when not exists (select 1 from public.produto_categorias pc where pc.produto_id = p.id)
      then 'categoria' end,
    case when not exists (select 1 from public.fotos fo where fo.produto_id = p.id) then 'foto' end,
    case when p.ncm is null then 'NCM' end
  ], null) as itens
) pendencia;

-- ---------------------------------------------------------------------------
-- Histórico e permissões
-- ---------------------------------------------------------------------------

create trigger registrar_historico
  after insert or update or delete on public.formas_venda
  for each row execute function public.registrar_historico();

create trigger registrar_historico
  after insert or update or delete on public.faixas_preco
  for each row execute function public.registrar_historico();

do $$
declare
  tabela text;
begin
  foreach tabela in array array['formas_venda', 'faixas_preco', 'compatibilidades', 'fotos'] loop
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

-- Forma de venda não se apaga (as vendas vão apontar para ela): é inativada.
revoke delete on public.formas_venda from authenticated;
