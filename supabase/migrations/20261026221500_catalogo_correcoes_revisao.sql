-- Correções da revisão independente do catálogo (plano 1.2). As migrações anteriores já estão no
-- banco de teste, então esta muda o que existe em vez de reescrever aquelas.

-- ---------------------------------------------------------------------------
-- Antes das regras novas: se já houver dados que elas recusariam, para aqui e lista o que
-- precisa ser resolvido à mão. Nada é apagado automaticamente.
-- ---------------------------------------------------------------------------

do $$
declare
  repetidos text;
begin
  select string_agg(format('produto %s: %s (%s vezes)', produto_id, atributos, total), '; ')
  into repetidos
  from (
    select produto_id, atributos, count(*) as total from public.variacoes
    where atributos <> '{}'::jsonb
    group by 1, 2 having count(*) > 1
  ) r;
  if repetidos is not null then
    raise exception 'Há variações com a mesma combinação de atributos no mesmo produto. Junte ou mude uma delas à mão antes de aplicar: %', repetidos;
  end if;

  select string_agg(format('%s (%s)', codigo, codigos), '; ')
  into repetidos
  from (
    select upper(trim(codigo_interno)) as codigo, string_agg(codigo_interno, ', ') as codigos
    from public.variacoes
    group by 1 having count(*) > 1
  ) r;
  if repetidos is not null then
    raise exception 'Há códigos internos que ficariam iguais em maiúsculas. Troque um deles à mão antes de aplicar: %', repetidos;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ficha do produto: dados, categorias e materiais gravados juntos (se algo falha, nada muda)
-- ---------------------------------------------------------------------------

create function public.atualizar_produto(p_produto uuid, dados jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_categorias uuid[] := array(select jsonb_array_elements_text(coalesce(dados -> 'categorias', '[]'))::uuid);
  v_etiquetas uuid[] := array(select jsonb_array_elements_text(coalesce(dados -> 'etiquetas', '[]'))::uuid);
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;

  update public.produtos set
    nome = trim(dados ->> 'nome'),
    descricao = coalesce(dados ->> 'descricao', ''),
    tipo_venda = (dados ->> 'tipo_venda')::public.tipo_venda,
    controla_validade = coalesce((dados ->> 'controla_validade')::boolean, false),
    ncm = nullif(dados ->> 'ncm', ''),
    cest = nullif(dados ->> 'cest', ''),
    origem_fiscal = nullif(dados ->> 'origem_fiscal', '')::smallint,
    apto_forno = coalesce((dados ->> 'apto_forno')::boolean, false),
    apto_freezer = coalesce((dados ->> 'apto_freezer')::boolean, false),
    apto_microondas = coalesce((dados ->> 'apto_microondas')::boolean, false),
    apto_alimento = coalesce((dados ->> 'apto_alimento')::boolean, false)
  where id = p_produto;
  if not found then
    raise exception 'Produto não encontrado.';
  end if;

  delete from public.produto_categorias where produto_id = p_produto and categoria_id <> all (v_categorias);
  insert into public.produto_categorias (produto_id, categoria_id)
  select p_produto, unnest(v_categorias)
  on conflict do nothing;

  delete from public.produto_etiquetas where produto_id = p_produto and etiqueta_id <> all (v_etiquetas);
  insert into public.produto_etiquetas (produto_id, etiqueta_id)
  select p_produto, unnest(v_etiquetas)
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Forma de venda x tipo de venda: por peso só a granel, por unidade nunca a granel,
-- mesmo com duas abas gravando ao mesmo tempo
-- ---------------------------------------------------------------------------

create or replace function public.formas_venda_combinam_com_produto()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tipo public.tipo_venda;
begin
  -- FOR SHARE: quem muda o tipo de venda do produto ao mesmo tempo espera esta forma terminar,
  -- e esta espera quem já está mudando o tipo (e então lê o tipo novo).
  select p.tipo_venda into v_tipo
  from public.produtos p join public.variacoes v on v.produto_id = p.id
  where v.id = new.variacao_id
  for share of p;

  if new.peso_variavel and v_tipo <> 'peso' then
    raise exception 'Só produto vendido por peso tem forma a granel.';
  end if;
  if not new.peso_variavel and v_tipo = 'peso' then
    raise exception 'Produto vendido por peso só tem forma a granel.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Faixas de preço: a conferência trava a forma, para duas transações não conferirem
-- cada uma sem ver a faixa da outra
-- ---------------------------------------------------------------------------

create or replace function public.conferir_faixas()
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

  -- Trava a forma até o fim da transação. Quem confere a mesma forma ao mesmo tempo espera
  -- e, depois, já enxerga as faixas gravadas aqui. NO KEY UPDATE não bloqueia quem só aponta
  -- para a forma (como a inclusão de uma faixa).
  select preco_centavos, peso_variavel into v_preco, v_granel
  from public.formas_venda where id = v_forma
  for no key update;
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

-- ---------------------------------------------------------------------------
-- Grade: cada combinação de atributos uma vez só por produto
-- ---------------------------------------------------------------------------

-- Variações feitas à mão ficam com atributos vazios e podem ser várias.
create unique index variacoes_atributos_por_produto
  on public.variacoes (produto_id, atributos)
  where atributos <> '{}'::jsonb;

-- Cria as combinações que ainda não existem e devolve quantas criou. Repetir a grade,
-- ou dois cliques ao mesmo tempo, não duplica nada.
create function public.gerar_grade(p_produto uuid, p_variacoes jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  criadas integer;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;

  with novas as (
    insert into public.variacoes (produto_id, nome, atributos)
    select p_produto, trim(v ->> 'nome'), v -> 'atributos'
    from jsonb_array_elements(p_variacoes) as v
    on conflict (produto_id, atributos) where atributos <> '{}'::jsonb do nothing
    returning 1
  )
  select count(*) into criadas from novas;
  return criadas;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fotos: o limite de 8 vale com duas fotos enviadas ao mesmo tempo e ao mudar a foto de produto
-- ---------------------------------------------------------------------------

create or replace function public.no_maximo_8_fotos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.produto_id = old.produto_id then
    return new;
  end if;
  -- Trava o produto até o fim da transação: duas fotos ao mesmo tempo são contadas uma depois da outra.
  perform 1 from public.produtos where id = new.produto_id for no key update;
  if (select count(*) from public.fotos where produto_id = new.produto_id) >= 8 then
    raise exception 'Cada produto pode ter até 8 fotos.';
  end if;
  return new;
end;
$$;

drop trigger no_maximo_8_fotos on public.fotos;
create trigger no_maximo_8_fotos
  before insert or update of produto_id on public.fotos
  for each row execute function public.no_maximo_8_fotos();

-- ---------------------------------------------------------------------------
-- Código interno: maiúsculas e sem espaços nas pontas ("tp-01" e "TP-01" são o mesmo código),
-- e a busca da compatibilidade compara o código exato, sem curingas
-- ---------------------------------------------------------------------------

create function public.normalizar_codigo_interno(codigo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(trim(codigo))
$$;

create function public.variacoes_normalizar_codigo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.codigo_interno := public.normalizar_codigo_interno(new.codigo_interno);
  return new;
end;
$$;

create trigger variacoes_normalizar_codigo
  before insert or update of codigo_interno on public.variacoes
  for each row execute function public.variacoes_normalizar_codigo();

-- Os códigos que já existem (a conferência lá em cima garante que nenhum fica repetido;
-- o histórico registra a troca).
update public.variacoes
set codigo_interno = public.normalizar_codigo_interno(codigo_interno)
where codigo_interno <> public.normalizar_codigo_interno(codigo_interno);

alter table public.variacoes
  add constraint variacoes_codigo_interno_normalizado
  check (codigo_interno = public.normalizar_codigo_interno(codigo_interno));

create function public.variacao_por_codigo(p_codigo text)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select id from public.variacoes where codigo_interno = public.normalizar_codigo_interno(p_codigo)
$$;
