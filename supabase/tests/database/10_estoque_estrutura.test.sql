-- Estoque, parte 1: lotes, saldos, movimentações, permissões e travas (R1, R2 e R4).
begin;
select plan(35);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true}');
insert into ids select 'tampa', criar_produto('{"nome":"Tampa","tipo_venda":"unidade"}');
insert into ids select 'var_forminha', id from variacoes where produto_id = (select id from ids where nome = 'forminha');
insert into ids select 'var_granulado', id from variacoes where produto_id = (select id from ids where nome = 'granulado');

-- As funções internas não estão liberadas para quem entra no site: os testes as chamam como dono do banco.
select tests.sair();

-- Lote GERAL (produto sem controle de validade)
insert into ids select 'geral', lote_geral((select id from ids where nome = 'var_forminha'));
select is((select codigo from lotes where id = (select id from ids where nome = 'geral')), 'GERAL', 'lote GERAL criado');
select is((select validade from lotes where id = (select id from ids where nome = 'geral')), null::date, 'GERAL sem validade');
select is(lote_geral((select id from ids where nome = 'var_forminha')), (select id from ids where nome = 'geral'),
  'chamar de novo devolve o mesmo lote');
select is((select quantidade from saldos where lote_id = (select id from ids where nome = 'geral')), 0::bigint,
  'o saldo nasce com o lote, zerado');

-- Lotes precisam combinar com o controle de validade do produto
select throws_ok(
  $$insert into lotes (variacao_id, codigo) values ((select id from ids where nome = 'var_granulado'), 'L1')$$,
  'P0001', 'Informe a validade: este produto controla validade.', 'lote sem validade em produto que controla');
select throws_ok(
  $$insert into lotes (variacao_id, codigo, validade) values ((select id from ids where nome = 'var_forminha'), 'L1', hoje_sp() + 30)$$,
  'P0001', 'Este produto não controla validade: o estoque fica num lote só.', 'produto sem controle só tem o lote GERAL');
select throws_ok(
  $$insert into lotes (variacao_id, codigo, validade) values ((select id from ids where nome = 'var_granulado'), 'ENT-X', hoje_sp() + 30),
                                                            ((select id from ids where nome = 'var_granulado'), 'ENT-X', hoje_sp() + 60)$$,
  '23505', null, 'código do lote não se repete na mesma variação');

-- Código gerado (R7)
select is(gerar_codigo_lote((select id from ids where nome = 'var_granulado'), 'ENT'), 'ENT-' || to_char(hoje_sp(), 'YYYY-MM-DD'),
  'código com a data de hoje em São Paulo');
insert into lotes (variacao_id, codigo, validade)
values ((select id from ids where nome = 'var_granulado'), 'ENT-' || to_char(hoje_sp(), 'YYYY-MM-DD'), hoje_sp() + 60);
select is(gerar_codigo_lote((select id from ids where nome = 'var_granulado'), 'ENT'), 'ENT-' || to_char(hoje_sp(), 'YYYY-MM-DD') || '-2',
  'repetido no mesmo dia ganha -2');

-- Movimentar e saldo nunca negativo (R1)
select lives_ok(
  $$select movimentar_lote((select id from ids where nome = 'geral'), 'ajuste_manual', 30, 'teste', '00000000-0000-0000-0000-00000000000a')$$,
  'ajuste para mais');
select is((select quantidade from saldos where lote_id = (select id from ids where nome = 'geral')), 30::bigint, 'saldo 30');
select is((select usuario_id from movimentacoes order by id desc limit 1), '00000000-0000-0000-0000-00000000000a'::uuid,
  'a movimentação guarda quem fez');
select throws_ok(
  $$select movimentar_lote((select id from ids where nome = 'geral'), 'ajuste_manual', -31, 'teste', '00000000-0000-0000-0000-00000000000a')$$,
  'P0001', 'Saldo insuficiente: há 30 un neste lote.', 'saldo 30 e saída de 31');
select is((select quantidade from saldos where lote_id = (select id from ids where nome = 'geral')), 30::bigint, 'saldo continua 30');
select throws_ok(
  $$select movimentar_lote((select id from ids where nome = 'geral'), 'perda_avaria', 5, 'teste', '00000000-0000-0000-0000-00000000000a')$$,
  '23514', null, 'perda não entra no estoque');

-- Lote vencido só sai como perda por vencimento (R4)
with l as (
  insert into lotes (variacao_id, codigo, validade) values ((select id from ids where nome = 'var_granulado'), 'VELHO', hoje_sp() - 1) returning id
) insert into ids select 'velho', id from l;
select lives_ok(
  $$select movimentar_lote((select id from ids where nome = 'velho'), 'ajuste_manual', 100, 'teste', '00000000-0000-0000-0000-00000000000a')$$,
  'ajuste para mais em lote vencido');
select throws_ok(
  $$select movimentar_lote((select id from ids where nome = 'velho'), 'perda_avaria', -10, 'teste', '00000000-0000-0000-0000-00000000000a')$$,
  'P0001', 'Lote vencido só sai como perda por vencimento.', 'perda por avaria em lote vencido');
select lives_ok(
  $$select movimentar_lote((select id from ids where nome = 'velho'), 'perda_vencimento', -10, 'teste', '00000000-0000-0000-0000-00000000000a')$$,
  'perda por vencimento em lote vencido');
select is((select quantidade from saldos where lote_id = (select id from ids where nome = 'velho')), 90::bigint, 'saldo do vencido 90');

-- Nada se apaga (R2)
select throws_ok($$update movimentacoes set motivo = 'outro'$$,
  'P0001', 'Movimentações não podem ser alteradas nem apagadas. Use o estorno.', 'movimentação não se altera');
select throws_ok($$delete from movimentacoes$$,
  'P0001', 'Movimentações não podem ser alteradas nem apagadas. Use o estorno.', 'movimentação não se apaga');

-- Produto com estoque não muda a unidade base nem o controle de validade
select throws_ok($$update produtos set tipo_venda = 'peso' where id = (select id from ids where nome = 'forminha')$$,
  'P0001', 'Não dá para mudar o tipo de venda: o produto já tem movimentações de estoque.', 'tipo de venda com movimentação');
select throws_ok($$update produtos set controla_validade = true where id = (select id from ids where nome = 'forminha')$$,
  'P0001', 'Não dá para mudar o controle de validade: o produto tem estoque.', 'controle de validade com saldo');
select lives_ok($$update produtos set tipo_venda = 'peso', controla_validade = true where id = (select id from ids where nome = 'tampa')$$,
  'produto sem estoque muda à vontade');

-- Custos e conferências: só o administrador lê
insert into custos_variacao (variacao_id, custo_medio) values ((select id from ids where nome = 'var_forminha'), 0.05);
insert into movimentacoes_custos (movimentacao_id, custo_unitario) select min(id), 0.05 from movimentacoes;
insert into verificacoes_integridade default values;

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select is((select count(*) from custos_variacao), 1::bigint, 'administradora lê o custo médio');
select is((select count(*) from movimentacoes_custos), 1::bigint, 'administradora lê o custo das entradas');
select is((select count(*) from verificacoes_integridade), 1::bigint, 'administradora lê as conferências');

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select ok((select count(*) from lotes) > 0, 'funcionária lê lotes');
select ok((select count(*) from saldos) > 0, 'funcionária lê saldos');
select ok((select count(*) from movimentacoes) > 0, 'funcionária lê movimentações');
select is((select count(*) from custos_variacao), 0::bigint, 'funcionária não lê custo médio');
select is((select count(*) from movimentacoes_custos), 0::bigint, 'funcionária não lê custo das entradas');
select is((select count(*) from verificacoes_integridade), 0::bigint, 'funcionária não lê conferências');
select throws_ok(
  $$insert into saldos (lote_id, variacao_id) values ((select id from ids where nome = 'velho'), (select id from ids where nome = 'var_granulado'))$$,
  '42501', null, 'ninguém grava direto nas tabelas do estoque');
select throws_ok(
  $$select movimentar_lote((select id from ids where nome = 'geral'), 'ajuste_manual', 1, 'teste', '00000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'função interna fechada para quem entra no site');

select * from finish();
rollback;
