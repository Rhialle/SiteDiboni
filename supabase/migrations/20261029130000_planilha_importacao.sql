-- Planilha, parte 2: grava a planilha já conferida pelo app, numa transação só (seção 9.2).
-- A prévia do app acha os erros por linha; aqui as regras do banco continuam valendo, e qualquer
-- erro desfaz a chamada inteira. Só o que é novo ou mudou é regravado (o histórico fica limpo).
create function public.importar_planilha(dados jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_produto jsonb;
  v_variacao jsonb;
  v_item jsonb;
  v_forma jsonb;
  v_texto text;
  v_nivel text;
  v_pai uuid;
  v_categoria uuid;
  v_material uuid;
  v_produto_id uuid;
  v_variacao_id uuid;
  v_dono uuid;
  v_forma_id uuid;
  v_codigo text;
  v_nome text;
  v_peso boolean;
  v_categorias uuid[];
  v_materiais uuid[];
  v_nomes text[];
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  -- Uma importação de cada vez.
  perform pg_advisory_xact_lock(hashtext('public.importar_planilha'));

  -- Antes de tudo, esvazia o código de barras das variações que vão trocar de código: assim dois
  -- códigos trocados entre si (até entre produtos diferentes) não esbarram na repetição no meio.
  update public.variacoes v set codigo_barras = null
  from (
    select public.normalizar_codigo_interno(x ->> 'codigo_interno') as codigo, nullif(x ->> 'codigo_barras', '') as barras
    from jsonb_array_elements(coalesce(dados -> 'produtos', '[]')) p, jsonb_array_elements(coalesce(p -> 'variacoes', '[]')) x
  ) n
  where v.codigo_interno = n.codigo and v.codigo_barras is not null and v.codigo_barras is distinct from n.barras;

  for v_produto in select value from jsonb_array_elements(coalesce(dados -> 'produtos', '[]')) loop
    -- Categorias: cada nível do caminho "Bolos > Caixas" é achado pelo nome dentro do pai, ou criado.
    v_categorias := '{}';
    for v_texto in select value from jsonb_array_elements_text(coalesce(v_produto -> 'categorias', '[]')) loop
      v_pai := null;
      foreach v_nivel in array regexp_split_to_array(v_texto, '>') loop
        v_nivel := trim(v_nivel);
        select c.id into v_categoria from public.categorias c
        where c.categoria_pai_id is not distinct from v_pai and lower(c.nome) = lower(v_nivel);
        if not found then
          insert into public.categorias (nome, categoria_pai_id) values (v_nivel, v_pai) returning id into v_categoria;
        end if;
        v_pai := v_categoria;
      end loop;
      v_categorias := v_categorias || v_pai;
    end loop;

    v_materiais := '{}';
    for v_texto in select value from jsonb_array_elements_text(coalesce(v_produto -> 'materiais', '[]')) loop
      select e.id into v_material from public.etiquetas e where lower(e.nome) = lower(trim(v_texto));
      if not found then
        insert into public.etiquetas (nome) values (trim(v_texto)) returning id into v_material;
      end if;
      v_materiais := v_materiais || v_material;
    end loop;

    v_produto_id := nullif(v_produto ->> 'id', '')::uuid;
    if v_produto_id is null then
      insert into public.produtos (nome, ncm, tipo_venda, controla_validade, apto_forno, apto_freezer, apto_microondas, apto_alimento)
      values (
        trim(v_produto ->> 'nome'), nullif(v_produto ->> 'ncm', ''), (v_produto ->> 'tipo_venda')::public.tipo_venda,
        (v_produto ->> 'controla_validade')::boolean, (v_produto ->> 'apto_forno')::boolean, (v_produto ->> 'apto_freezer')::boolean,
        (v_produto ->> 'apto_microondas')::boolean, (v_produto ->> 'apto_alimento')::boolean)
      returning id into v_produto_id;
    else
      update public.produtos p set
        nome = n.nome, ncm = n.ncm, tipo_venda = n.tipo_venda, controla_validade = n.controla_validade,
        apto_forno = n.apto_forno, apto_freezer = n.apto_freezer, apto_microondas = n.apto_microondas, apto_alimento = n.apto_alimento
      from (select
        trim(v_produto ->> 'nome') as nome, nullif(v_produto ->> 'ncm', '') as ncm,
        (v_produto ->> 'tipo_venda')::public.tipo_venda as tipo_venda, (v_produto ->> 'controla_validade')::boolean as controla_validade,
        (v_produto ->> 'apto_forno')::boolean as apto_forno, (v_produto ->> 'apto_freezer')::boolean as apto_freezer,
        (v_produto ->> 'apto_microondas')::boolean as apto_microondas, (v_produto ->> 'apto_alimento')::boolean as apto_alimento) n
      where p.id = v_produto_id
        and (p.nome, p.ncm, p.tipo_venda, p.controla_validade, p.apto_forno, p.apto_freezer, p.apto_microondas, p.apto_alimento)
          is distinct from (n.nome, n.ncm, n.tipo_venda, n.controla_validade, n.apto_forno, n.apto_freezer, n.apto_microondas, n.apto_alimento);
      if not exists (select 1 from public.produtos where id = v_produto_id) then
        raise exception 'Produto não encontrado. Recarregue e confira a planilha de novo.';
      end if;
    end if;

    -- A planilha manda: o produto fica só com as categorias e os materiais dela.
    delete from public.produto_categorias where produto_id = v_produto_id and categoria_id <> all (v_categorias);
    insert into public.produto_categorias (produto_id, categoria_id)
    select v_produto_id, c from unnest(v_categorias) c
    where not exists (select 1 from public.produto_categorias pc where pc.produto_id = v_produto_id and pc.categoria_id = c);
    delete from public.produto_etiquetas where produto_id = v_produto_id and etiqueta_id <> all (v_materiais);
    insert into public.produto_etiquetas (produto_id, etiqueta_id)
    select v_produto_id, e from unnest(v_materiais) e
    where not exists (select 1 from public.produto_etiquetas pe where pe.produto_id = v_produto_id and pe.etiqueta_id = e);

    for v_variacao in select value from jsonb_array_elements(coalesce(v_produto -> 'variacoes', '[]')) loop
      v_codigo := public.normalizar_codigo_interno(v_variacao ->> 'codigo_interno');
      v_nome := coalesce(nullif(trim(v_variacao ->> 'nome'), ''), 'Padrão');
      select v.id, v.produto_id into v_variacao_id, v_dono from public.variacoes v where v.codigo_interno = v_codigo;
      if not found then
        insert into public.variacoes
          (produto_id, nome, codigo_interno, codigo_barras, estoque_minimo, comprimento_mm, largura_mm, altura_mm, capacidade_ml)
        values (
          v_produto_id, v_nome, v_codigo, nullif(v_variacao ->> 'codigo_barras', ''),
          coalesce((v_variacao ->> 'estoque_minimo')::bigint, 0), (v_variacao ->> 'comprimento_mm')::integer,
          (v_variacao ->> 'largura_mm')::integer, (v_variacao ->> 'altura_mm')::integer, (v_variacao ->> 'capacidade_ml')::integer);
      elsif v_dono <> v_produto_id then
        raise exception 'Variação % não é do produto %.', v_codigo, (select p.nome from public.produtos p where p.id = v_produto_id);
      else
        update public.variacoes v set
          nome = n.nome, codigo_barras = n.codigo_barras, estoque_minimo = n.estoque_minimo,
          comprimento_mm = n.comprimento_mm, largura_mm = n.largura_mm, altura_mm = n.altura_mm, capacidade_ml = n.capacidade_ml
        from (select
          v_nome as nome, nullif(v_variacao ->> 'codigo_barras', '') as codigo_barras,
          coalesce((v_variacao ->> 'estoque_minimo')::bigint, 0) as estoque_minimo,
          (v_variacao ->> 'comprimento_mm')::integer as comprimento_mm, (v_variacao ->> 'largura_mm')::integer as largura_mm,
          (v_variacao ->> 'altura_mm')::integer as altura_mm, (v_variacao ->> 'capacidade_ml')::integer as capacidade_ml) n
        where v.id = v_variacao_id
          and (v.nome, v.codigo_barras, v.estoque_minimo, v.comprimento_mm, v.largura_mm, v.altura_mm, v.capacidade_ml)
            is distinct from (n.nome, n.codigo_barras, n.estoque_minimo, n.comprimento_mm, n.largura_mm, n.altura_mm, n.capacidade_ml);
      end if;
    end loop;
  end loop;

  -- Formas: a variação da lista fica só com estas. A forma é achada pelo nome (sem diferença de
  -- maiúsculas); no produto por peso, a forma única é a granel que já existe, mesmo com outro nome.
  for v_item in select value from jsonb_array_elements(coalesce(dados -> 'formas', '[]')) loop
    v_codigo := public.normalizar_codigo_interno(v_item ->> 'codigo_interno');
    select v.id, p.tipo_venda = 'peso' into v_variacao_id, v_peso
    from public.variacoes v join public.produtos p on p.id = v.produto_id
    where v.codigo_interno = v_codigo;
    if not found then
      raise exception 'Nenhuma variação com este código interno: %.', v_codigo;
    end if;

    v_nomes := '{}';
    for v_forma in select value from jsonb_array_elements(coalesce(v_item -> 'formas', '[]')) loop
      v_nome := trim(v_forma ->> 'nome');
      v_nomes := v_nomes || lower(v_nome);
      v_forma_id := null;
      if v_peso then
        select f.id into v_forma_id from public.formas_venda f where f.variacao_id = v_variacao_id and f.peso_variavel;
      end if;
      if v_forma_id is null then
        select f.id into v_forma_id from public.formas_venda f
        where f.variacao_id = v_variacao_id and lower(trim(f.nome)) = lower(v_nome);
      end if;

      if v_forma_id is null then
        insert into public.formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel)
        values (v_variacao_id, v_nome, (v_forma ->> 'fator')::bigint, (v_forma ->> 'preco_centavos')::integer, v_peso)
        returning id into v_forma_id;
      else
        -- O nome só muda quando é outro (não por maiúsculas): o da granel trocado na planilha.
        update public.formas_venda f set
          nome = case when lower(trim(f.nome)) = lower(v_nome) then f.nome else v_nome end,
          fator = (v_forma ->> 'fator')::bigint, preco_centavos = (v_forma ->> 'preco_centavos')::integer,
          peso_variavel = v_peso, ativa = true
        where f.id = v_forma_id
          and (lower(trim(f.nome)), f.fator, f.preco_centavos, f.peso_variavel, f.ativa)
            is distinct from (lower(v_nome), (v_forma ->> 'fator')::bigint, (v_forma ->> 'preco_centavos')::integer, v_peso, true);
      end if;

      -- Faixas: ficam só as da lista.
      delete from public.faixas_preco fx
      where fx.forma_venda_id = v_forma_id
        and fx.quantidade_minima not in (
          select (x ->> 'quantidade_minima')::integer from jsonb_array_elements(coalesce(v_forma -> 'faixas', '[]')) x);
      insert into public.faixas_preco (forma_venda_id, quantidade_minima, preco_centavos)
      select v_forma_id, (x ->> 'quantidade_minima')::integer, (x ->> 'preco_centavos')::integer
      from jsonb_array_elements(coalesce(v_forma -> 'faixas', '[]')) x
      on conflict (forma_venda_id, quantidade_minima) do update set preco_centavos = excluded.preco_centavos
      where public.faixas_preco.preco_centavos is distinct from excluded.preco_centavos;
    end loop;

    -- A forma que sumiu da planilha é desativada, não apagada.
    update public.formas_venda f set ativa = false
    where f.variacao_id = v_variacao_id and f.ativa and lower(trim(f.nome)) <> all (v_nomes);
  end loop;
end;
$$;
