-- Código de barras na forma de venda (fase 2.1): o do pacote ou da caixa do fornecedor, além do da
-- unidade (na variação). No balcão, bipar o código de uma forma põe essa forma na venda. Um código
-- só aponta para uma coisa: não se repete entre formas nem entre formas e variações.

alter table public.formas_venda
  add column codigo_barras text
    constraint formas_venda_codigo_barras_key unique
    check (codigo_barras is null or public.gtin_valido(codigo_barras));

-- Formas e variações: o mesmo código não pode estar nas duas. A trava pelo código evita que duas
-- gravações ao mesmo tempo passem uma pela outra.
create function public.codigo_barras_livre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.codigo_barras is null then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('codigo_barras:' || new.codigo_barras));
  if (tg_table_name = 'formas_venda' and exists (
        select 1 from public.variacoes where codigo_barras = new.codigo_barras))
     or (tg_table_name = 'variacoes' and exists (
        select 1 from public.formas_venda where codigo_barras = new.codigo_barras)) then
    raise exception 'Este código de barras já está em outra variação ou forma de venda.';
  end if;
  return new;
end;
$$;

create trigger codigo_barras_livre
  before insert or update of codigo_barras on public.formas_venda
  for each row execute function public.codigo_barras_livre();

create trigger codigo_barras_livre
  before insert or update of codigo_barras on public.variacoes
  for each row execute function public.codigo_barras_livre();
