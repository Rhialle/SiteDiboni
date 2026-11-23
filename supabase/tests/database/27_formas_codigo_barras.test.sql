-- Código de barras na forma de venda (o do pacote ou da caixa), único entre formas e variações.
begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

select criar_produto('{"nome":"Forminha","tipo_venda":"unidade","variacao":{"nome":"N4","codigo_interno":"FM-1","codigo_barras":"7891000000014"}}');
select criar_produto('{"nome":"Tampa","tipo_venda":"unidade","variacao":{"codigo_interno":"TP-1"}}');
create function pg_temp.var(p_codigo text) returns uuid language sql as $$ select id from variacoes where codigo_interno = p_codigo $$;
insert into formas_venda (variacao_id, nome, fator, preco_centavos) values (pg_temp.var('FM-1'), 'Pacote com 100', 100, 1500);
insert into formas_venda (variacao_id, nome, fator, preco_centavos) values (pg_temp.var('TP-1'), 'Pacote com 50', 50, 900);
create function pg_temp.forma(p_codigo text) returns uuid language sql as $$
  select f.id from formas_venda f where f.variacao_id = pg_temp.var(p_codigo) limit 1
$$;

select lives_ok(
  $$update formas_venda set codigo_barras = '7891000000021' where id = pg_temp.forma('FM-1')$$,
  'grava o código de barras do pacote');
select is((select codigo_barras from formas_venda where id = pg_temp.forma('FM-1')), '7891000000021', 'o código fica na forma');
select throws_ok(
  $$update formas_venda set codigo_barras = '7891000000022' where id = pg_temp.forma('TP-1')$$,
  '23514', null, 'código com dígito verificador errado é recusado');
select throws_ok(
  $$update formas_venda set codigo_barras = '7891000000021' where id = pg_temp.forma('TP-1')$$,
  '23505', null, 'o mesmo código em duas formas é recusado');
select throws_ok(
  $$update formas_venda set codigo_barras = '7891000000014' where id = pg_temp.forma('TP-1')$$,
  'P0001', 'Este código de barras já está em outra variação ou forma de venda.', 'código de uma variação não vai numa forma');
select throws_ok(
  $$update variacoes set codigo_barras = '7891000000021' where codigo_interno = 'TP-1'$$,
  'P0001', 'Este código de barras já está em outra variação ou forma de venda.', 'código de uma forma não vai numa variação');
select lives_ok(
  $$update formas_venda set codigo_barras = null where id = pg_temp.forma('FM-1')$$,
  'o código da forma pode ser apagado');

select * from finish();
rollback;
