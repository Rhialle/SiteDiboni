-- Inventário: as variações do escopo que ainda não têm nenhuma contagem neste inventário.
--
-- Mostrada para quem conta (com a contagem aberta) e para o administrador na revisão, para não
-- esquecer prateleira. Só lê: não cria lote nem mexe no estoque, e não traz saldo (a contagem
-- continua às cegas). "Contada" é a variação com pelo menos um lote contado, a mesma regra do
-- número variacoes_contadas de resumo_inventario.
create function public.variacoes_nao_contadas(p_inventario bigint)
returns table (
  variacao_id uuid,
  produto text,
  variacao text,
  codigo_interno text
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
  select v.id, p.nome, v.nome, v.codigo_interno
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
