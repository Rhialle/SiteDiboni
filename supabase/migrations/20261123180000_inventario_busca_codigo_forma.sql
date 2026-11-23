-- Fase 2.2: a busca da contagem acha a variação também pelo código de barras da forma de venda (o do
-- pacote ou da caixa), para ler pela câmera o código que estiver na embalagem.

create or replace function public.itens_para_contar(p_inventario bigint, p_busca text)
returns table (
  variacao_id uuid,
  produto text,
  variacao text,
  codigo_interno text,
  tipo_venda public.tipo_venda,
  controla_validade boolean,
  lotes jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_termo text := extensions.unaccent('extensions.unaccent'::regdictionary, lower(trim(coalesce(p_busca, ''))));
  v_achadas uuid[];
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if not exists (select 1 from public.inventarios i where i.id = p_inventario) then
    raise exception 'Inventário não encontrado.';
  end if;

  v_achadas := array(
    select v.id
    from public.variacoes v join public.produtos p on p.id = v.produto_id
    where v.id in (select public.variacoes_do_inventario(p_inventario))
      and (
        extensions.unaccent('extensions.unaccent'::regdictionary, lower(p.nome || ' ' || v.nome)) like '%' || v_termo || '%'
        or v.codigo_interno = public.normalizar_codigo_interno(p_busca)
        or v.codigo_barras = trim(p_busca)
        or exists (select 1 from public.formas_venda fv where fv.variacao_id = v.id and fv.codigo_barras = trim(p_busca))
      )
    order by p.nome, v.nome
    limit 30);

  perform public.lote_geral(v.id)
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = any (v_achadas) and not p.controla_validade;

  return query
  select v.id, p.nome, v.nome, v.codigo_interno, p.tipo_venda, p.controla_validade,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('lote_id', l.id, 'codigo', l.codigo, 'validade', l.validade, 'contado', ii.quantidade_contada)
        order by l.validade nulls last, l.codigo)
      from public.lotes l
      left join public.inventario_itens ii on ii.lote_id = l.id and ii.inventario_id = p_inventario
      where l.variacao_id = v.id
        and case
          when p.controla_validade then
            ii.id is not null or exists (select 1 from public.saldos s where s.lote_id = l.id and s.quantidade > 0)
          else l.codigo = 'GERAL'
        end
    ), '[]')
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = any (v_achadas)
  order by p.nome, v.nome;
end;
$$;
