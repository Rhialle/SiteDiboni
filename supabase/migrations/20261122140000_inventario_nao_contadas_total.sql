-- Inventário: variacoes_nao_contadas passa a trazer, em cada linha, o total de variações não contadas.
--
-- A API do banco devolve no máximo 1000 linhas por consulta (max_rows). Na contagem da loja
-- inteira a lista pode passar disso: com o total em cada linha, a tela mostra o número certo e
-- avisa que a lista veio cortada, em vez de dizer "1000" sem aviso.
drop function public.variacoes_nao_contadas(bigint);

create function public.variacoes_nao_contadas(p_inventario bigint)
returns table (
  variacao_id uuid,
  produto text,
  variacao text,
  codigo_interno text,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if not exists (select 1 from public.inventarios i where i.id = p_inventario) then
    raise exception 'Inventário não encontrado.';
  end if;

  return query
  select v.id, p.nome, v.nome, v.codigo_interno, count(*) over ()
  from public.variacoes v
  join public.produtos p on p.id = v.produto_id
  where v.id in (select public.variacoes_do_inventario(p_inventario))
    and not exists (
      select 1 from public.inventario_itens ii
      where ii.inventario_id = p_inventario and ii.variacao_id = v.id
    )
  order by p.nome, v.nome;
end;
$$;
