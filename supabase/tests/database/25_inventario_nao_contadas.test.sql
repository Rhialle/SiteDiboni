-- Inventário: as variações do escopo que ainda não foram contadas (só leitura, sem saldo).
begin;
select plan(10);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id text);
insert into ids select 'forminha', criar_produto(
  '{"nome":"Forminha de pão","tipo_venda":"unidade","variacao":{"nome":"N4","codigo_interno":"FM-1"}}')::text;
insert into variacoes (produto_id, nome, codigo_interno) values ((select id::uuid from ids where nome = 'forminha'), 'N5', 'FM-2');
select criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true,"variacao":{"nome":"Chocolate","codigo_interno":"GR-1"}}');
select criar_produto('{"nome":"Tampa","tipo_venda":"unidade","variacao":{"codigo_interno":"TP-1"}}');

create function pg_temp.var(p_codigo text) returns uuid language sql as $$ select id from variacoes where codigo_interno = p_codigo $$;
create function pg_temp.lote(p_codigo text, p_lote text) returns uuid language sql as $$
  select id from lotes where variacao_id = pg_temp.var(p_codigo) and codigo = p_lote
$$;
create function pg_temp.inv(p_nome text) returns bigint language sql as $$ select id::bigint from ids where nome = p_nome $$;
create function pg_temp.faltam() returns text language sql as $$
  select string_agg(codigo_interno, ',' order by ordem)
  from (select codigo_interno, row_number() over () as ordem from variacoes_nao_contadas(pg_temp.inv('inv'))) f
$$;

-- Granulado com dois lotes com saldo: L-A e L-B
select registrar_entrada_manual(pg_temp.var('GR-1'), 1000, 0.03, 'compra', hoje_sp() + 60, 'L-A');
select registrar_entrada_manual(pg_temp.var('GR-1'), 500, 0.03, 'compra', hoje_sp() + 90, 'L-B');

insert into ids select 'inv', abrir_inventario('Prateleira', 'variacoes', '{}', array['FM-1', 'FM-2', 'GR-1', 'TP-1'])::text;

select is(pg_temp.faltam(), 'FM-1,FM-2,GR-1,TP-1', 'antes de contar, todas, em ordem de produto e variação');
select ok(
  pg_get_function_result('variacoes_nao_contadas(bigint)'::regprocedure) not ilike '%saldo%',
  'nenhuma coluna de saldo');

create temp table lotes_antes as select count(*) as total from lotes;
select variacoes_nao_contadas(pg_temp.inv('inv'));
select is((select count(*) from lotes), (select total from lotes_antes), 'consultar não cria lote');

-- FM-1 no lote geral; o Granulado só no lote L-A (o L-B fica sem contar)
select contar_item(pg_temp.inv('inv'), pg_temp.var('FM-1'), null, 90);
select contar_item(pg_temp.inv('inv'), pg_temp.var('GR-1'), pg_temp.lote('GR-1', 'L-A'), 950);
select is(pg_temp.faltam(), 'FM-2,TP-1', 'contadas saem da lista; um lote contado basta para a variação');
select is(
  (select produto || ' / ' || variacao from variacoes_nao_contadas(pg_temp.inv('inv')) where codigo_interno = 'TP-1'),
  'Tampa / Padrão', 'traz o nome do produto e da variação');

select is(
  (select array_agg(distinct total) from variacoes_nao_contadas(pg_temp.inv('inv'))), array[2::bigint],
  'cada linha traz o total de não contadas (a lista pode chegar cortada pelo limite de linhas)');

select throws_ok($$select variacoes_nao_contadas(999999)$$, 'P0001', 'Inventário não encontrado.', 'inventário inexistente');

-- A funcionária ativa também vê (é quem conta)
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select lives_ok($$select variacoes_nao_contadas(pg_temp.inv('inv'))$$, 'funcionária ativa consulta');
select is(pg_temp.faltam(), 'FM-2,TP-1', 'a funcionária vê a mesma lista');

-- Desativada, não
select tests.sair();
update usuarios set ativo = false where id = '00000000-0000-0000-0000-00000000000b';
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select throws_ok($$select variacoes_nao_contadas(pg_temp.inv('inv'))$$, 'P0001',
  'Você não tem permissão para acessar esta página.', 'funcionária desativada não consulta');

select * from finish();
rollback;
