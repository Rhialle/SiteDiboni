begin;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test'),
  ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
with c as (insert into categorias (nome) values ('Bolos') returning id) insert into ids select 'bolos', id from c;
with c as (insert into categorias (nome, categoria_pai_id) values ('Caixas', (select id from ids where nome = 'bolos')) returning id)
  insert into ids select 'caixas', id from c;
with c as (insert into categorias (nome) values ('Doces') returning id) insert into ids select 'doces', id from c;

insert into ids select 'caixa', criar_produto(jsonb_build_object(
  'nome', 'Caixa para bolo', 'tipo_venda', 'unidade',
  'categorias', jsonb_build_array((select id from ids where nome = 'caixas')),
  'variacao', jsonb_build_object('codigo_barras', '4006381333931')));
insert into ids select 'forminha', criar_produto(jsonb_build_object(
  'nome', 'Forminha nº 4', 'tipo_venda', 'unidade',
  'categorias', jsonb_build_array((select id from ids where nome = 'doces'))));
insert into ids select 'tampa', criar_produto('{"nome":"Tampa","tipo_venda":"unidade"}');

-- Preços: caixa 6,00 com faixa 10+ a 5,40; forminha 1,05; tampa 3,00 com faixas 1,00 e 0,99
with f as (
  insert into formas_venda (variacao_id, nome, fator, preco_centavos)
  select id, 'Pacote com 100', 100, 600 from variacoes where produto_id = (select id from ids where nome = 'caixa')
  returning id
) insert into ids select 'forma_caixa', id from f;
insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos)
  values ((select id from ids where nome = 'forma_caixa'), 10, 540);
with f as (
  insert into formas_venda (variacao_id, nome, fator, preco_centavos)
  select id, 'Unidade', 1, 105 from variacoes where produto_id = (select id from ids where nome = 'forminha')
  returning id
) insert into ids select 'forma_forminha', id from f;
with f as (
  insert into formas_venda (variacao_id, nome, fator, preco_centavos)
  select id, 'Unidade', 1, 300 from variacoes where produto_id = (select id from ids where nome = 'tampa')
  returning id
) insert into ids select 'forma_tampa', id from f;
insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values
  ((select id from ids where nome = 'forma_tampa'), 10, 100),
  ((select id from ids where nome = 'forma_tampa'), 20, 99);

-- Busca
select is((select count(*) from buscar_produtos('caixa', null, null, null, null, null, 50, 0)), 1::bigint,
  'sem diferenciar maiúsculas');
select is((select nome from buscar_produtos('forminha n', null, null, null, null, null, 50, 0)), 'Forminha nº 4',
  'parte do nome');
select is((select count(*) from buscar_produtos('Forminhá', null, null, null, null, null, 50, 0)), 1::bigint,
  'sem acento');
select is((select nome from buscar_produtos('4006381333931', null, null, null, null, null, 50, 0)), 'Caixa para bolo',
  'por código de barras');
select is((select count(*) from buscar_produtos(null, (select id from ids where nome = 'bolos'), null, null, null, null, 50, 0)),
  1::bigint, 'categoria inclui subcategorias');
select is((select total from buscar_produtos(null, null, null, null, null, null, 1, 0) limit 1), 3::bigint,
  'total ignora a paginação');
select is((select count(*) from buscar_produtos(null, null, 'incompleto', null, null, null, 50, 0)), 3::bigint,
  'filtro por situação');

-- Reajuste em massa: tudo ou nada, arredondado ao centavo
select is(reajustar_precos(array[(select id from ids where nome = 'caixa'), (select id from ids where nome = 'forminha')], 10),
  2, 'devolve quantos produtos');
select is((select preco_centavos from formas_venda where id = (select id from ids where nome = 'forma_caixa')), 660,
  '6,00 + 10% = 6,60');
select is((select preco_centavos from faixas_preco where forma_venda_id = (select id from ids where nome = 'forma_caixa')), 594,
  'faixa 5,40 + 10% = 5,94');
select is((select preco_centavos from formas_venda where id = (select id from ids where nome = 'forma_forminha')), 116,
  '1,05 + 10% = 1,155, arredonda para 1,16');
select throws_ok(
  $$select reajustar_precos(array[(select id from ids where nome = 'tampa')], -50)$$,
  'P0001', 'O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.',
  'desconto que empata faixas é recusado');
select is((select min(preco_centavos) from faixas_preco where forma_venda_id = (select id from ids where nome = 'forma_tampa')), 99,
  'nenhum preço mudou');
select throws_ok($$select reajustar_precos(array[(select id from ids where nome = 'tampa')], -100)$$,
  'P0001', 'Informe o reajuste em %, por exemplo 10 ou -5.', 'percentual impossível');

-- Categoria e inativação em massa
select is(alterar_categoria_em_massa(
  array[(select id from ids where nome = 'caixa'), (select id from ids where nome = 'forminha')],
  (select id from ids where nome = 'doces'), true), 2, 'inclui categoria');
select is((select count(*) from produto_categorias where categoria_id = (select id from ids where nome = 'doces')), 2::bigint,
  'sem duplicar quem já tinha');
select is(alterar_inativo_em_massa(
  array[(select id from ids where nome = 'caixa'), (select id from ids where nome = 'forminha')], true), 2, 'inativa');
select is((select count(*) from produtos_com_situacao where situacao = 'inativo'), 2::bigint, 'os dois inativos');

-- Funcionária não usa a edição em massa
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select throws_ok($$select reajustar_precos(array[(select id from ids where nome = 'caixa')], 10)$$,
  'P0001', 'Você não tem permissão para acessar esta página.', 'funcionária não reajusta');
select throws_ok($$select alterar_inativo_em_massa(array[(select id from ids where nome = 'caixa')], false)$$,
  'P0001', 'Você não tem permissão para acessar esta página.', 'funcionária não inativa');

select * from finish();
rollback;
