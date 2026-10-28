-- Notas de entrada, parte 1: fornecedores, ligações, notas, itens, lotes, valores, permissões e bucket.
begin;
select plan(17);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'var_forminha', id from variacoes where produto_id = (select id from ids where nome = 'forminha');

-- Ninguém grava direto nessas tabelas: o teste prepara os dados como dono do banco.
select tests.sair();

-- Fornecedores
select throws_ok($$insert into fornecedores (cnpj, nome) values ('11111111111111', 'Inválido')$$,
  '23514', null, 'CNPJ inválido');
with f as (insert into fornecedores (cnpj, nome) values ('11444777000161', 'Embalagens Exemplo Ltda') returning id)
insert into ids select 'fornecedor', id from f;
select throws_ok($$insert into fornecedores (cnpj, nome) values ('11444777000161', 'Outro nome')$$,
  '23505', null, 'CNPJ repetido');

-- Ligações lembradas (fornecedor + código + unidade)
insert into fornecedor_itens (fornecedor_id, codigo_fornecedor, unidade_fornecedor, descricao_fornecedor, variacao_id, fator)
values ((select id from ids where nome = 'fornecedor'), 'A1', 'CX', 'FORMINHA N4 CX', (select id from ids where nome = 'var_forminha'), 100);
select throws_ok(
  $$insert into fornecedor_itens (fornecedor_id, codigo_fornecedor, unidade_fornecedor, descricao_fornecedor, variacao_id, fator)
    values ((select id from ids where nome = 'fornecedor'), 'A1', 'CX', 'outra', (select id from ids where nome = 'var_forminha'), 50)$$,
  '23505', null, 'mesma ligação (fornecedor, código e unidade)');

-- Notas: chave de 44 dígitos, única enquanto não descartada
select throws_ok(
  $$insert into notas_entrada (chave_acesso, fornecedor_id, numero, serie, emitida_em, caminho_xml, situacao, importada_por)
    values (repeat('1', 43), (select id from ids where nome = 'fornecedor'), '1', '1', now(), 'a.xml', 'em_revisao',
            '00000000-0000-0000-0000-00000000000a')$$,
  '23514', null, 'chave com 43 dígitos');
with n as (
  insert into notas_entrada (chave_acesso, fornecedor_id, numero, serie, emitida_em, caminho_xml, situacao, importada_por)
  values (repeat('2', 44), (select id from ids where nome = 'fornecedor'), '10', '1', now(), 'b.xml', 'em_revisao',
          '00000000-0000-0000-0000-00000000000a') returning id)
insert into ids select 'nota', id from n;
select throws_ok(
  $$insert into notas_entrada (chave_acesso, fornecedor_id, numero, serie, emitida_em, caminho_xml, situacao, importada_por)
    values (repeat('2', 44), (select id from ids where nome = 'fornecedor'), '10', '1', now(), 'c.xml', 'em_revisao',
            '00000000-0000-0000-0000-00000000000a')$$,
  '23505', null, 'a mesma chave duas vezes');
update notas_entrada set situacao = 'descartada' where id = (select id from ids where nome = 'nota');
select lives_ok(
  $$insert into notas_entrada (chave_acesso, fornecedor_id, numero, serie, emitida_em, caminho_xml, situacao, importada_por)
    values (repeat('2', 44), (select id from ids where nome = 'fornecedor'), '10', '1', now(), 'd.xml', 'em_revisao',
            '00000000-0000-0000-0000-00000000000a')$$,
  'depois de descartada, a chave pode entrar de novo');

-- Item, lote e valores
with i as (
  insert into notas_entrada_itens (nota_id, numero_item, codigo_fornecedor, descricao, unidade, quantidade_nota)
  values ((select id from ids where nome = 'nota'), 1, 'A1', 'FORMINHA N4 CX', 'CX', 2.5) returning id)
insert into ids select 'item', id from i;
insert into notas_entrada_item_lotes (item_id, codigo_lote, validade, quantidade_base)
values ((select id from ids where nome = 'item'), 'L1', current_date + 90, 250);
insert into notas_entrada_itens_valores (item_id, valor_produto, custo_total)
values ((select id from ids where nome = 'item'), 100, 102);
select throws_ok(
  $$insert into notas_entrada_itens (nota_id, numero_item, codigo_fornecedor, descricao, unidade, quantidade_nota)
    values ((select id from ids where nome = 'nota'), 1, 'A2', 'outro', 'UN', 1)$$,
  '23505', null, 'número do item não se repete na nota');

-- Histórico das ligações
update fornecedor_itens set fator = 50 where codigo_fornecedor = 'A1';
select ok(exists (select 1 from historico_cadastro where tabela = 'fornecedor_itens' and campo = 'fator'),
  'mudar a ligação fica no histórico');

-- Bucket do XML original: privado, até 4 MB
select results_eq(
  $$select public, file_size_limit from storage.buckets where id = 'notas-xml'$$,
  $$values (false, 4194304::bigint)$$,
  'bucket notas-xml privado, até 4 MB');

-- Permissões
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select is((select count(*) from notas_entrada_itens_valores), 1::bigint, 'administradora lê os valores da nota');

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select ok((select count(*) from fornecedores) > 0, 'funcionária lê fornecedores');
select ok((select count(*) from fornecedor_itens) > 0, 'funcionária lê as ligações');
select ok((select count(*) from notas_entrada) > 0, 'funcionária lê as notas');
select ok((select count(*) from notas_entrada_itens) > 0, 'funcionária lê os itens');
select ok((select count(*) from notas_entrada_item_lotes) > 0, 'funcionária lê os lotes da nota');
select is((select count(*) from notas_entrada_itens_valores), 0::bigint, 'funcionária não lê os valores da nota');
select throws_ok(
  $$insert into fornecedores (cnpj, nome) values ('04252011000110', 'Doces Exemplo Ltda')$$,
  '42501', null, 'ninguém grava direto nas tabelas das notas');

select * from finish();
rollback;
