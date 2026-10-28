-- Notas de entrada, parte 3: ligar itens, recebimento e lotes, confirmação e descarte.
-- Todas travam a nota: dois cliques ou duas abas fazem uma coisa de cada vez.

-- Trava a nota e recusa a que já foi confirmada ou descartada. Devolve a nota.
create function public.travar_nota_aberta(p_nota uuid)
returns public.notas_entrada
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota public.notas_entrada;
begin
  select * into v_nota from public.notas_entrada where id = p_nota for update;
  if not found then
    raise exception 'Nota não encontrada.';
  end if;
  if v_nota.situacao in ('confirmada', 'descartada') then
    raise exception 'Esta nota já foi confirmada ou descartada.';
  end if;
  return v_nota;
end;
$$;

revoke execute on function public.travar_nota_aberta(uuid) from public, anon, authenticated;

-- Só o administrador liga: o item e os outros da mesma nota com o mesmo código e unidade. A ligação
-- fica lembrada para as próximas notas do fornecedor. Sem itens soltos, a nota vai para revisão.
create function public.ligar_item_nota(p_item uuid, p_variacao uuid, p_fator bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.notas_entrada_itens;
  v_nota public.notas_entrada;
  v_irmao uuid;
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  select * into v_item from public.notas_entrada_itens where id = p_item;
  if not found then
    raise exception 'Item da nota não encontrado.';
  end if;
  v_nota := public.travar_nota_aberta(v_item.nota_id);

  for v_irmao in
    select id from public.notas_entrada_itens
    where nota_id = v_item.nota_id and codigo_fornecedor = v_item.codigo_fornecedor and unidade = v_item.unidade
    order by numero_item
  loop
    perform public.aplicar_ligacao_item(v_irmao, p_variacao, p_fator);
  end loop;

  insert into public.fornecedor_itens
    (fornecedor_id, codigo_fornecedor, unidade_fornecedor, descricao_fornecedor, codigo_barras, variacao_id, fator)
  values
    (v_nota.fornecedor_id, v_item.codigo_fornecedor, v_item.unidade, v_item.descricao, v_item.codigo_barras, p_variacao, p_fator)
  on conflict (fornecedor_id, codigo_fornecedor, unidade_fornecedor) do update
  set variacao_id = excluded.variacao_id, fator = excluded.fator,
      descricao_fornecedor = excluded.descricao_fornecedor, codigo_barras = excluded.codigo_barras;

  if not exists (select 1 from public.notas_entrada_itens where nota_id = v_nota.id and variacao_id is null) then
    update public.notas_entrada set situacao = 'em_revisao' where id = v_nota.id;
  end if;
end;
$$;

-- Confere os lotes de um item: produto com validade precisa de lotes com validade, somando a recebida.
create function public.conferir_lotes_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.notas_entrada_itens;
  v_controla boolean;
  v_soma bigint;
begin
  select * into v_item from public.notas_entrada_itens where id = p_item;
  select p.controla_validade into v_controla
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = v_item.variacao_id;
  if not v_controla or v_item.quantidade_base_recebida = 0 then
    return;
  end if;
  if exists (select 1 from public.notas_entrada_item_lotes where item_id = p_item and validade is null) then
    raise exception 'Item % (%): informe a validade de cada lote.', v_item.numero_item, v_item.descricao;
  end if;
  select coalesce(sum(quantidade_base), 0) into v_soma from public.notas_entrada_item_lotes where item_id = p_item;
  if v_soma <> v_item.quantidade_base_recebida then
    raise exception 'Item % (%): a soma dos lotes (%) precisa ser igual à quantidade recebida (%).',
      v_item.numero_item, v_item.descricao, v_soma, v_item.quantidade_base_recebida;
  end if;
end;
$$;

revoke execute on function public.conferir_lotes_item(uuid) from public, anon, authenticated;

-- Quantidade recebida (unidade base) e lotes de um item: [{codigo, validade, quantidade}].
-- Os lotes são substituídos; no produto sem validade, ficam de fora (a entrada vai para o lote único).
create function public.salvar_recebimento_item(p_item uuid, p_quantidade_recebida bigint, p_lotes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.notas_entrada_itens;
  v_controla boolean;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  select * into v_item from public.notas_entrada_itens where id = p_item;
  if not found then
    raise exception 'Item da nota não encontrado.';
  end if;
  perform public.travar_nota_aberta(v_item.nota_id);
  if v_item.variacao_id is null then
    raise exception 'Este item ainda não está ligado: o administrador precisa ligá-lo.';
  end if;
  if p_quantidade_recebida is null or p_quantidade_recebida < 0 then
    raise exception 'Informe uma quantidade inteira maior que zero.';
  end if;

  update public.notas_entrada_itens set quantidade_base_recebida = p_quantidade_recebida where id = p_item;
  delete from public.notas_entrada_item_lotes where item_id = p_item;

  select p.controla_validade into v_controla
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = v_item.variacao_id;
  if v_controla then
    insert into public.notas_entrada_item_lotes (item_id, codigo_lote, validade, quantidade_base)
    select p_item, nullif(trim(l ->> 'codigo'), ''), nullif(l ->> 'validade', '')::date, (l ->> 'quantidade')::bigint
    from jsonb_array_elements(coalesce(p_lotes, '[]')) as l
    where coalesce((l ->> 'quantidade')::bigint, 0) > 0;
    perform public.conferir_lotes_item(p_item);
  end if;
end;
$$;

-- Confirma a nota: uma entrada por lote (ou uma por item, no produto sem validade), com o custo
-- por unidade base do item. Tudo ou nada; depois de confirmada, a nota não muda mais.
create function public.confirmar_nota(p_nota uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota public.notas_entrada;
  v_motivo text;
  v_item record;
  v_lote record;
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  v_nota := public.travar_nota_aberta(p_nota);
  if v_nota.situacao <> 'em_revisao'
     or exists (select 1 from public.notas_entrada_itens where nota_id = p_nota and variacao_id is null) then
    raise exception 'Ainda há itens sem ligação: o administrador precisa ligá-los.';
  end if;

  select 'Nota nº ' || v_nota.numero || ' de ' || f.nome into v_motivo
  from public.fornecedores f where f.id = v_nota.fornecedor_id;

  for v_item in
    select i.id, i.variacao_id, i.quantidade_base_recebida, v.custo_unitario_base, p.controla_validade
    from public.notas_entrada_itens i
    join public.notas_entrada_itens_valores v on v.item_id = i.id
    join public.variacoes va on va.id = i.variacao_id
    join public.produtos p on p.id = va.produto_id
    where i.nota_id = p_nota and i.quantidade_base_recebida > 0
    order by i.numero_item
  loop
    perform public.conferir_lotes_item(v_item.id);
    if v_item.controla_validade then
      for v_lote in select codigo_lote, validade, quantidade_base from public.notas_entrada_item_lotes where item_id = v_item.id loop
        perform public.entrar_no_estoque(
          v_item.variacao_id, v_lote.quantidade_base, v_item.custo_unitario_base, v_lote.validade, v_lote.codigo_lote,
          'entrada_nota', v_motivo, auth.uid(), 'nota', p_nota::text);
      end loop;
    else
      perform public.entrar_no_estoque(
        v_item.variacao_id, v_item.quantidade_base_recebida, v_item.custo_unitario_base, null, null,
        'entrada_nota', v_motivo, auth.uid(), 'nota', p_nota::text);
    end if;
  end loop;

  update public.notas_entrada
  set situacao = 'confirmada', confirmada_por = auth.uid(), confirmada_em = now()
  where id = p_nota;
end;
$$;

-- Descarta uma nota ainda não confirmada: nada muda no estoque e a chave fica livre.
create function public.descartar_nota(p_nota uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  perform public.travar_nota_aberta(p_nota);
  update public.notas_entrada set situacao = 'descartada' where id = p_nota;
end;
$$;
