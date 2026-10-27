begin;
select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test', '{"nome":"Dona"}'),
  ('00000000-0000-0000-0000-00000000000b', 'func@loja.test', '{"nome":"Func"}');

-- Código de barras (GTIN)
select ok(gtin_valido('4006381333931'), 'EAN-13 válido');
select ok(gtin_valido('96385074'), 'EAN-8 válido');
select ok(gtin_valido('036000291452'), 'UPC-A válido');
select ok(not gtin_valido('4006381333932'), 'dígito verificador errado');
select ok(not gtin_valido('12345'), 'tamanho errado');

-- Produto com a primeira variação, numa transação só
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
create temp table ids (nome text primary key, id uuid);
insert into ids
  select 'forminha', criar_produto('{"nome":"Forminha nº 4","tipo_venda":"unidade","variacao":{"nome":"Marrom"}}');
select is((select count(*) from variacoes where produto_id = (select id from ids where nome = 'forminha')),
  1::bigint, 'produto nasce com uma variação');
select is((select codigo_interno from variacoes where produto_id = (select id from ids where nome = 'forminha')),
  'P000001', 'primeiro código interno gerado');
select is((select nome from variacoes where produto_id = (select id from ids where nome = 'forminha')),
  'Marrom', 'nome da variação vem dos dados');

-- Código digitado à mão é respeitado; o gerado pula os que já existem
insert into variacoes (produto_id, nome, codigo_interno)
  values ((select id from ids where nome = 'forminha'), 'Branca', 'P000002');
insert into variacoes (produto_id, nome) values ((select id from ids where nome = 'forminha'), 'Azul');
select is((select codigo_interno from variacoes where nome = 'Azul'), 'P000003', 'gerado pula código já usado');

-- Categorias
with c as (insert into categorias (nome) values ('Bolos') returning id) insert into ids select 'bolos', id from c;
with c as (insert into categorias (nome) values ('Festas') returning id) insert into ids select 'festas', id from c;
with c as (
  insert into categorias (nome, categoria_pai_id) values ('Caixas para bolo', (select id from ids where nome = 'bolos')) returning id
) insert into ids select 'caixas', id from c;
select throws_ok($$insert into categorias (nome) values ('BOLOS')$$, '23505', null, 'nome repetido no mesmo nível');
select lives_ok($$insert into categorias (nome, categoria_pai_id) values ('Bolos', (select id from ids where nome = 'festas'))$$,
  'mesmo nome em outro nível pode');
select throws_ok(
  $$update categorias set categoria_pai_id = (select id from ids where nome = 'caixas') where id = (select id from ids where nome = 'bolos')$$,
  'P0001', 'Uma categoria não pode ficar dentro dela mesma.', 'não deixa ciclo');
select throws_ok($$delete from categorias where id = (select id from ids where nome = 'bolos')$$, '23503', null,
  'não apaga categoria com subcategoria');
select throws_ok($$delete from variacoes where nome = 'Azul'$$, '42501', null, 'ninguém apaga variação');

-- Histórico
update produtos set nome = 'Forminha de papel nº 4' where id = (select id from ids where nome = 'forminha');
select results_eq(
  $$select campo, valor_antigo, valor_novo from historico_cadastro where tabela = 'produtos' and campo = 'nome'$$,
  $$values ('nome', 'Forminha nº 4', 'Forminha de papel nº 4')$$,
  'mudança no produto fica no histórico');

-- Funcionária lê, mas não grava
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select is((select count(*) from produtos), 1::bigint, 'funcionária lê produtos');
select throws_ok($$insert into produtos (nome, tipo_venda) values ('Intrusa', 'unidade')$$, '42501', null,
  'funcionária não cria produto');
select throws_ok($$select criar_produto('{"nome":"Outra","tipo_venda":"unidade"}')$$, 'P0001',
  'Você não tem permissão para acessar esta página.', 'funcionária não usa criar_produto');
update categorias set nome = 'Invasão' where nome = 'Festas';
select tests.sair();
select is((select count(*) from categorias where nome = 'Invasão'), 0::bigint, 'funcionária não altera categoria');

select * from finish();
rollback;
