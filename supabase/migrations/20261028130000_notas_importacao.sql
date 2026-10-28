-- Notas de entrada, parte 2: importação e ligação automática dos itens (R6).

-- "2.5000" → "2,5", para as mensagens.
create function public.quantidade_para_mensagem(p_quantidade numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(rtrim(rtrim(p_quantidade::text, '0'), '.'), '.', ',')
$$;

-- Liga um item da nota a uma variação com o fator (unidades base por unidade da nota). Aplica a R6:
-- a quantidade da nota e a de cada lote do rastro, vezes o fator, precisam dar inteiro. Grava as
-- quantidades base (a recebida começa igual à da nota), recria os lotes do rastro (só se o produto
-- controla validade) e calcula o custo por unidade base.
create function public.aplicar_ligacao_item(p_item uuid, p_variacao uuid, p_fator bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.notas_entrada_itens;
  v_controla boolean;
  v_base numeric;
  v_lote jsonb;
  v_quantidade_lote numeric;
begin
  select * into v_item from public.notas_entrada_itens where id = p_item;
  if not found then
    raise exception 'Item da nota não encontrado.';
  end if;
  select p.controla_validade into v_controla
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = p_variacao;
  if v_controla is null then
    raise exception 'Variação não encontrada.';
  end if;
  if p_fator is null or p_fator <= 0 then
    raise exception 'Informe uma quantidade inteira maior que zero.';
  end if;

  v_base := v_item.quantidade_nota * p_fator;
  if v_base <> trunc(v_base) then
    raise exception 'Item % (%): % % × % não dá quantidade inteira. Confira o fator.',
      v_item.numero_item, v_item.descricao, public.quantidade_para_mensagem(v_item.quantidade_nota), v_item.unidade, p_fator;
  end if;

  update public.notas_entrada_itens
  set variacao_id = p_variacao, fator = p_fator,
      quantidade_base_nota = v_base::bigint, quantidade_base_recebida = v_base::bigint
  where id = p_item;

  delete from public.notas_entrada_item_lotes where item_id = p_item;
  if v_controla then
    for v_lote in select value from jsonb_array_elements(v_item.rastro) loop
      v_quantidade_lote := (v_lote ->> 'quantidade')::numeric * p_fator;
      if v_quantidade_lote <> trunc(v_quantidade_lote) then
        raise exception 'Item % (%): % % × % não dá quantidade inteira. Confira o fator.',
          v_item.numero_item, v_item.descricao, public.quantidade_para_mensagem((v_lote ->> 'quantidade')::numeric),
          v_item.unidade, p_fator;
      end if;
      if v_quantidade_lote > 0 then
        insert into public.notas_entrada_item_lotes (item_id, codigo_lote, validade, quantidade_base)
        values (p_item, nullif(trim(v_lote ->> 'codigo'), ''), nullif(v_lote ->> 'validade', '')::date, v_quantidade_lote::bigint);
      end if;
    end loop;
  end if;

  update public.notas_entrada_itens_valores
  set custo_unitario_base = round(custo_total / v_base, 6)
  where item_id = p_item;
end;
$$;

revoke execute on function public.aplicar_ligacao_item(uuid, uuid, bigint) from public, anon, authenticated;

-- Importa uma nota já lida pelo app (o XML original fica no Storage, em dados.caminho_xml).
-- Confere o CNPJ da loja, o destinatário e a chave; cria ou atualiza o fornecedor; grava itens e
-- valores; liga sozinho os itens que o fornecedor já mandou antes. Devolve o id da nota.
create function public.importar_nota(dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cnpj_loja text;
  v_chave text := dados ->> 'chave';
  v_anterior record;
  v_fornecedor uuid;
  v_nota uuid;
  v_item jsonb;
  v_item_id uuid;
  v_valores jsonb;
  v_ligacao record;
  v_sem_ligacao integer := 0;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;

  select cnpj_loja into v_cnpj_loja from public.configuracoes where id = 1;
  if v_cnpj_loja is null then
    raise exception 'Informe o CNPJ da loja em Configurações antes de importar notas.';
  end if;
  if coalesce(dados ->> 'destinatario_cnpj', '') <> v_cnpj_loja then
    raise exception 'Esta nota não é para a loja: o destinatário é outro CNPJ.';
  end if;

  select n.importada_em, u.nome into v_anterior
  from public.notas_entrada n left join public.usuarios u on u.id = n.importada_por
  where n.chave_acesso = v_chave and n.situacao <> 'descartada';
  if found then
    raise exception 'Esta nota já foi importada em % por %.',
      to_char(v_anterior.importada_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), coalesce(v_anterior.nome, 'outra pessoa');
  end if;

  insert into public.fornecedores (cnpj, nome)
  values (dados #>> '{emitente,cnpj}', trim(dados #>> '{emitente,nome}'))
  on conflict (cnpj) do update set nome = excluded.nome
  returning id into v_fornecedor;

  insert into public.notas_entrada (chave_acesso, fornecedor_id, numero, serie, emitida_em, caminho_xml, situacao, importada_por)
  values (v_chave, v_fornecedor, dados ->> 'numero', dados ->> 'serie', (dados ->> 'emitida_em')::timestamptz,
          dados ->> 'caminho_xml', 'aguardando_administrador', auth.uid())
  returning id into v_nota;

  for v_item in select value from jsonb_array_elements(dados -> 'itens') loop
    insert into public.notas_entrada_itens
      (nota_id, numero_item, codigo_fornecedor, descricao, codigo_barras, ncm, unidade, quantidade_nota, rastro)
    values
      (v_nota, (v_item ->> 'numero_item')::integer, v_item ->> 'codigo', v_item ->> 'descricao',
       nullif(v_item ->> 'codigo_barras', ''), nullif(v_item ->> 'ncm', ''), v_item ->> 'unidade',
       (v_item ->> 'quantidade')::numeric, coalesce(v_item -> 'rastro', '[]'))
    returning id into v_item_id;

    -- 9.1: custo do item = vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vICMSST.
    v_valores := v_item -> 'valores';
    insert into public.notas_entrada_itens_valores
      (item_id, valor_produto, desconto, frete, seguro, outras_despesas, ipi, icms_st, custo_total)
    select v_item_id, x.vp, x.d, x.f, x.s, x.o, x.i, x.st, x.vp - x.d + x.f + x.s + x.o + x.i + x.st
    from (select
      coalesce((v_valores ->> 'valor_produto')::numeric, 0) as vp,
      coalesce((v_valores ->> 'desconto')::numeric, 0) as d,
      coalesce((v_valores ->> 'frete')::numeric, 0) as f,
      coalesce((v_valores ->> 'seguro')::numeric, 0) as s,
      coalesce((v_valores ->> 'outras_despesas')::numeric, 0) as o,
      coalesce((v_valores ->> 'ipi')::numeric, 0) as i,
      coalesce((v_valores ->> 'icms_st')::numeric, 0) as st) x;

    select variacao_id, fator into v_ligacao
    from public.fornecedor_itens
    where fornecedor_id = v_fornecedor and codigo_fornecedor = v_item ->> 'codigo' and unidade_fornecedor = v_item ->> 'unidade';
    if found then
      begin
        perform public.aplicar_ligacao_item(v_item_id, v_ligacao.variacao_id, v_ligacao.fator);
      exception when raise_exception then
        -- R6: com o fator lembrado não dá inteiro; o administrador liga de novo.
        v_sem_ligacao := v_sem_ligacao + 1;
      end;
    else
      v_sem_ligacao := v_sem_ligacao + 1;
    end if;
  end loop;

  if v_sem_ligacao = 0 then
    update public.notas_entrada set situacao = 'em_revisao' where id = v_nota;
  end if;
  return v_nota;
end;
$$;
