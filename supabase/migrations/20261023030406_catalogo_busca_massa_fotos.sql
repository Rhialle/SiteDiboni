-- Catálogo, parte 3: busca, edição em massa e fotos.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Busca da lista de produtos
-- ---------------------------------------------------------------------------

-- Todos os filtros são opcionais (nulo = sem filtro).
create function public.buscar_produtos(
  p_termo text default null,
  p_categoria uuid default null,
  p_situacao text default null,
  p_tipo_venda public.tipo_venda default null,
  p_controla_validade boolean default null,
  p_etiqueta uuid default null,
  p_limite integer default 50,
  p_deslocamento integer default 0
)
returns table (
  id uuid,
  nome text,
  situacao text,
  tipo_venda public.tipo_venda,
  variacoes integer,
  menor_preco_centavos integer,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive arvore as (
    -- A categoria escolhida e todas as que estão dentro dela.
    select c.id from public.categorias c where c.id = p_categoria
    union all
    select c.id from public.categorias c join arvore a on c.categoria_pai_id = a.id
  ),
  termo as (
    select extensions.unaccent('extensions.unaccent'::regdictionary, lower(trim(coalesce(p_termo, '')))) as texto
  )
  select
    p.id,
    p.nome,
    p.situacao,
    p.tipo_venda,
    (select count(*)::integer from public.variacoes v where v.produto_id = p.id),
    (
      select min(f.preco_centavos) from public.formas_venda f join public.variacoes v on v.id = f.variacao_id
      where v.produto_id = p.id and v.ativa and f.ativa
    ),
    count(*) over ()
  from public.produtos_com_situacao p
  cross join termo
  where (
      termo.texto = ''
      or extensions.unaccent('extensions.unaccent'::regdictionary, lower(p.nome)) like '%' || termo.texto || '%'
      or exists (
        select 1 from public.variacoes v
        where v.produto_id = p.id and (lower(v.codigo_interno) = termo.texto or v.codigo_barras = termo.texto)
      )
    )
    and (p_categoria is null or exists (
      select 1 from public.produto_categorias pc
      where pc.produto_id = p.id and pc.categoria_id in (select a.id from arvore a)
    ))
    and (p_situacao is null or p.situacao = p_situacao)
    and (p_tipo_venda is null or p.tipo_venda = p_tipo_venda)
    and (p_controla_validade is null or p.controla_validade = p_controla_validade)
    and (p_etiqueta is null or exists (
      select 1 from public.produto_etiquetas pe where pe.produto_id = p.id and pe.etiqueta_id = p_etiqueta
    ))
  order by p.nome
  limit p_limite offset p_deslocamento
$$;

-- ---------------------------------------------------------------------------
-- Edição em massa (só administrador)
-- ---------------------------------------------------------------------------

-- Reajusta todas as formas de venda e faixas dos produtos, arredondando ao centavo.
-- Se alguma faixa sair da ordem, nada muda.
create function public.reajustar_precos(p_produtos uuid[], p_percentual numeric)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  multiplicador numeric;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if p_percentual is null or p_percentual <= -100 then
    raise exception '%', 'Informe o reajuste em %, por exemplo 10 ou -5.';
  end if;
  multiplicador := 1 + p_percentual / 100;

  update public.formas_venda f
  set preco_centavos = round(f.preco_centavos * multiplicador)
  from public.variacoes v
  where v.id = f.variacao_id and v.produto_id = any (p_produtos);

  update public.faixas_preco fp
  set preco_centavos = round(fp.preco_centavos * multiplicador)
  from public.formas_venda f
  join public.variacoes v on v.id = f.variacao_id
  where f.id = fp.forma_venda_id and v.produto_id = any (p_produtos);

  -- Confere a ordem das faixas agora, para o erro sair daqui e desfazer tudo.
  set constraints public.faixas_em_ordem immediate;

  return (select count(*) from public.produtos where id = any (p_produtos));
end;
$$;

create function public.alterar_categoria_em_massa(p_produtos uuid[], p_categoria uuid, p_incluir boolean)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;

  if p_incluir then
    insert into public.produto_categorias (produto_id, categoria_id)
    select p.id, p_categoria from public.produtos p where p.id = any (p_produtos)
    on conflict do nothing;
  else
    delete from public.produto_categorias
    where categoria_id = p_categoria and produto_id = any (p_produtos);
  end if;

  return (select count(*) from public.produtos where id = any (p_produtos));
end;
$$;

create function public.alterar_inativo_em_massa(p_produtos uuid[], p_inativo boolean)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;

  update public.produtos set inativo = p_inativo where id = any (p_produtos);
  return (select count(*) from public.produtos where id = any (p_produtos));
end;
$$;

-- ---------------------------------------------------------------------------
-- Fotos: até 8 por produto, guardadas no bucket público fotos-produtos
-- ---------------------------------------------------------------------------

create function public.no_maximo_8_fotos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.fotos where produto_id = new.produto_id) >= 8 then
    raise exception 'Cada produto pode ter até 8 fotos.';
  end if;
  return new;
end;
$$;

create trigger no_maximo_8_fotos
  before insert on public.fotos
  for each row execute function public.no_maximo_8_fotos();

-- Público para leitura (o site da fase 3 mostra as fotos); só o administrador envia ou apaga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-produtos', 'fotos-produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "fotos-produtos: listagem por usuário ativo"
  on storage.objects for select to authenticated
  using (bucket_id = 'fotos-produtos' and public.eh_usuario_ativo());

create policy "fotos-produtos: envio pelo administrador"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-produtos' and public.eh_administrador());

create policy "fotos-produtos: alteração pelo administrador"
  on storage.objects for update to authenticated
  using (bucket_id = 'fotos-produtos' and public.eh_administrador());

create policy "fotos-produtos: exclusão pelo administrador"
  on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-produtos' and public.eh_administrador());
