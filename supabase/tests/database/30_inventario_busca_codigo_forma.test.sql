-- Contagem do inventário: a busca acha a variação também pelo código de barras da forma (o do pacote).
begin;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select criar_produto('{"nome":"Forminha","tipo_venda":"unidade","variacao":{"nome":"N4","codigo_interno":"FM-1","codigo_barras":"7891000000014"}}');
insert into formas_venda (variacao_id, nome, fator, preco_centavos, codigo_barras)
  values ((select id from variacoes where codigo_interno = 'FM-1'), 'Pacote com 100', 100, 1500, '7891000000021');
create temp table ids (id bigint);
insert into ids select abrir_inventario('Prateleira', 'variacoes', '{}', array['FM-1']);

select is((select codigo_interno from itens_para_contar((select id from ids), '7891000000021')), 'FM-1', 'acha pelo código do pacote');
select is((select codigo_interno from itens_para_contar((select id from ids), '7891000000014')), 'FM-1', 'continua achando pelo código da unidade');
select is((select count(*) from itens_para_contar((select id from ids), '7891000000038')), 0::bigint, 'código que não existe não acha nada');

select * from finish();
rollback;
