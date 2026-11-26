-- Balcão, parte 2.4: a troca (o devolvido volta ao estoque e abate o pagamento da venda).
begin;
select plan(36);

set constraints all immediate;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

-- Catálogo: Forminha N4 (Unidade R$ 0,20 e "Pacote com 100" R$ 15,00, faixa a partir de 3 R$ 13,50),
-- Granulado (granel R$ 40,00/kg, com validade), Pote (com validade, sem lote), Tampa (sem estoque) e
-- Caixa inativa (R$ 1,00).
select criar_produto('{"nome":"Forminha","tipo_venda":"unidade","variacao":{"nome":"N4","codigo_interno":"FM-1","codigo_barras":"7891000000014"}}');
select criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true,"variacao":{"nome":"Chocolate","codigo_interno":"GR-1"}}');
select criar_produto('{"nome":"Pote","tipo_venda":"unidade","controla_validade":true,"variacao":{"codigo_interno":"PT-1"}}');
select criar_produto('{"nome":"Tampa","tipo_venda":"unidade","variacao":{"codigo_interno":"TP-1"}}');
select criar_produto('{"nome":"Caixa","tipo_venda":"unidade","variacao":{"codigo_interno":"CX-1"}}');
create function pg_temp.var(p_codigo text) returns uuid language sql as $$ select id from variacoes where codigo_interno = p_codigo $$;
insert into formas_venda (variacao_id, nome, fator, preco_centavos) values
  (pg_temp.var('FM-1'), 'Unidade', 1, 20),
  (pg_temp.var('FM-1'), 'Pacote com 100', 100, 1500),
  (pg_temp.var('PT-1'), 'Unidade', 1, 300),
  (pg_temp.var('TP-1'), 'Unidade', 1, 50),
  (pg_temp.var('CX-1'), 'Unidade', 1, 100);
insert into formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel) values
  (pg_temp.var('GR-1'), 'Granel', 1000, 4000, true);
create function pg_temp.forma(p_codigo text, p_nome text) returns uuid language sql as $$
  select id from formas_venda where variacao_id = pg_temp.var(p_codigo) and nome = p_nome
$$;
insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values (pg_temp.forma('FM-1', 'Pacote com 100'), 3, 1350);
update produtos set inativo = true where id = (select produto_id from variacoes where id = pg_temp.var('CX-1'));

-- Estoque: Forminha 1000 un a R$ 0,05; Granulado 5000 g válido.
select registrar_entrada_manual(pg_temp.var('FM-1'), 1000, 0.05, 'compra');
select registrar_entrada_manual(pg_temp.var('GR-1'), 5000, 0.03, 'compra', hoje_sp() + 60, 'L-B');
select tests.sair();

create function pg_temp.saldo(p_codigo text) returns bigint language sql as $$
  select coalesce(sum(quantidade), 0) from saldos where variacao_id = pg_temp.var(p_codigo)
$$;
create function pg_temp.item(p_forma uuid, p_qtd integer) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('forma_venda_id', p_forma, 'quantidade', p_qtd))
$$;
create function pg_temp.dev(p_forma uuid, p_qtd integer, p_validade text default null) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('forma_venda_id', p_forma, 'quantidade', p_qtd, 'validade', p_validade))
$$;
create function pg_temp.pix(p_valor integer) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor_centavos', p_valor))
$$;
create function pg_temp.pacote() returns uuid language sql as $$ select pg_temp.forma('FM-1', 'Pacote com 100') $$;
create function pg_temp.dinheiro_esperado() returns integer language sql as $$
  select esperado_centavos from esperado_do_caixa((select id from caixas where situacao = 'aberto')) where forma = 'dinheiro'
$$;

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select abrir_caixa(5000);

-- Devolve 1 Pacote (R$ 15,00), leva 2 (R$ 30,00) e paga R$ 15,00 em dinheiro
create temp table t1 as select * from registrar_venda(
  pg_temp.item(pg_temp.pacote(), 2), 0,
  jsonb_build_array(jsonb_build_object('forma', 'dinheiro', 'valor_centavos', 1500)), 3000,
  null, pg_temp.dev(pg_temp.pacote(), 1), 1500);
select results_eq($$select total_centavos, devolvido_centavos from vendas where id = (select venda_id from t1)$$,
  $$values (3000, 1500)$$, 'a venda guarda o total e o devolvido');
select results_eq(
  $$select quantidade, quantidade_base, preco_unitario_centavos, total_centavos from venda_devolucoes where venda_id = (select venda_id from t1)$$,
  $$values (1::bigint, 100::bigint, 1500, 1500)$$, 'o devolvido fica guardado com o preço');
select is(pg_temp.saldo('FM-1'), 900::bigint, 'entraram 100 un e saíram 200');
select results_eq(
  $$select motivo, origem from movimentacoes where tipo = 'entrada_troca' and origem_id = (select venda_id from t1)::text$$,
  format($$values (%L::text, 'venda'::text)$$, 'Troca na venda nº ' || (select numero from t1)), 'uma entrada de troca ligada à venda');
-- O custo e o esperado do caixa não são lidos pela funcionária: confere fora da sessão dela.
select tests.sair();
select ok(
  (select round(mc.custo_unitario, 4) = 0.05 from movimentacoes_custos mc join movimentacoes m on m.id = mc.movimentacao_id
   where m.tipo = 'entrada_troca' and m.origem_id = (select venda_id from t1)::text),
  'a entrada vai pelo custo médio do momento (R$ 0,05)');
select ok((select round(custo_medio, 4) = 0.05 from custos_variacao where variacao_id = pg_temp.var('FM-1')),
  'o custo médio não muda');
select is(pg_temp.dinheiro_esperado(), 6500, 'o caixa espera só a diferença paga');
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');

-- O devolvido vale o preço de 1 forma: 3 Pacotes = R$ 45,00 (sem a faixa); granel pelo kg
create temp table t2 as select * from registrar_venda(
  pg_temp.item(pg_temp.pacote(), 4), 0, pg_temp.pix(900), 5400, null, pg_temp.dev(pg_temp.pacote(), 3), 4500);
select is((select total_centavos from venda_devolucoes where venda_id = (select venda_id from t2)), 4500, '3 pacotes sem a faixa');
create temp table t3 as select * from registrar_venda(
  pg_temp.item(pg_temp.pacote(), 1), 0, pg_temp.pix(500), 1500, null, pg_temp.dev(pg_temp.forma('GR-1', 'Granel'), 250), 1000);
select is((select total_centavos from venda_devolucoes where venda_id = (select venda_id from t3)), 1000, '250 g a R$ 40,00/kg');
create temp table t4 as select * from registrar_venda(
  pg_temp.item(pg_temp.forma('FM-1', 'Unidade'), 1), 0, pg_temp.pix(16), 20, null, pg_temp.dev(pg_temp.forma('GR-1', 'Granel'), 1), 4);
select is((select total_centavos from venda_devolucoes where venda_id = (select venda_id from t4)), 4, '1 g = R$ 0,04');

-- Devolvido igual ao total: sem pagamento, e o caixa não muda
select tests.sair();
select pg_temp.dinheiro_esperado() as antes into temp esperado_antes;
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
create temp table t5 as select * from registrar_venda(
  pg_temp.item(pg_temp.pacote(), 1), 0, '[]', 1500, null, pg_temp.dev(pg_temp.pacote(), 1), 1500);
select is((select count(*) from venda_pagamentos where venda_id = (select venda_id from t5)), 0::bigint, 'troca sem diferença não tem pagamento');
select tests.sair();
select is(pg_temp.dinheiro_esperado(), (select antes from esperado_antes), 'o caixa não muda');
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');

-- Recusas
select throws_ok(
  format($$select * from registrar_venda(pg_temp.item(%L, 1), 0, '[]', 20, null, pg_temp.dev(%L, 1), 1500)$$,
    pg_temp.forma('FM-1', 'Unidade'), pg_temp.pacote()),
  'P0001', 'O devolvido vale mais que o que o cliente leva.', 'devolvido maior que o total');
select throws_ok(
  format($$select * from registrar_venda('[]', 0, '[]', 0, null, pg_temp.dev(%L, 1), 1500)$$, pg_temp.pacote()),
  'P0001', 'A venda não tem itens.', 'devolvido sem nada levado');
select throws_ok(
  format($$select * from registrar_venda(pg_temp.item(%L, 2), 0, pg_temp.pix(3000), 3000, null, pg_temp.dev(%L, 1), 1500)$$,
    pg_temp.pacote(), pg_temp.pacote()),
  'P0001', 'A soma dos pagamentos não bate com o total.', 'pagamento sem abater o devolvido');
select throws_ok(
  format($$select * from registrar_venda(pg_temp.item(%L, 2), 0, pg_temp.pix(1600), 3000, null, pg_temp.dev(%L, 1), 1400)$$,
    pg_temp.pacote(), pg_temp.pacote()),
  'P0001', 'O valor do devolvido mudou: confira os preços e tente de novo.', 'valor do devolvido diferente');

-- Devolvido com validade sem lote válido: pede a validade; com ela, cria o lote
select throws_ok(
  format($$select * from registrar_venda(pg_temp.item(%L, 1), 0, pg_temp.pix(1200), 1500, null, pg_temp.dev(%L, 1), 300)$$,
    pg_temp.pacote(), pg_temp.forma('PT-1', 'Unidade')),
  'P0001', 'Informe a validade da embalagem de Pote – Padrão.', 'pede a validade do devolvido');
select lives_ok(
  format($$select * from registrar_venda(pg_temp.item(%L, 1), 0, pg_temp.pix(1200), 1500, null, pg_temp.dev(%L, 1, %L), 300)$$,
    pg_temp.pacote(), pg_temp.forma('PT-1', 'Unidade'), (hoje_sp() + 90)::text),
  'com a validade, a troca entra');
select is(pg_temp.saldo('PT-1'), 1::bigint, 'o Pote devolvido está no estoque');

-- Produto que não está mais à venda pode voltar
select lives_ok(
  format($$select * from registrar_venda(pg_temp.item(%L, 1), 0, pg_temp.pix(1400), 1500, null, pg_temp.dev(%L, 1), 100)$$,
    pg_temp.pacote(), pg_temp.forma('CX-1', 'Unidade')),
  'devolve a Caixa inativa');
select is(pg_temp.saldo('CX-1'), 1::bigint, 'a Caixa voltou ao estoque');

-- A mesma variação devolvida e levada: o devolvido conta como saldo (sem venda sem saldo)
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select registrar_perda_ou_ajuste(pg_temp.var('FM-1'), null, 'perda_avaria', -pg_temp.saldo('FM-1'), 'zerar para o teste');
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
create temp table t6 as select * from registrar_venda(
  pg_temp.item(pg_temp.forma('FM-1', 'Unidade'), 80), 0, pg_temp.pix(100), 1600, null, pg_temp.dev(pg_temp.pacote(), 1), 1500);
select is((select quantidade_sem_saldo_base from venda_itens where venda_id = (select venda_id from t6)), 0::bigint,
  'as 80 un saem do pacote devolvido');
select is(pg_temp.saldo('FM-1'), 20::bigint, 'sobram 20 un');

-- A mesma troca enviada de novo (a resposta se perdeu): a mesma venda, o devolvido entra uma vez
create temp table t7 as select * from registrar_venda(
  pg_temp.item(pg_temp.pacote(), 2), 0, pg_temp.pix(1500), 3000,
  '00000000-0000-0000-0000-0000000000c1', pg_temp.dev(pg_temp.pacote(), 1), 1500);
create temp table t7b as select * from registrar_venda(
  pg_temp.item(pg_temp.pacote(), 2), 0, pg_temp.pix(1500), 3000,
  '00000000-0000-0000-0000-0000000000c1', pg_temp.dev(pg_temp.pacote(), 1), 1500);
select is((select numero from t7b), (select numero from t7), 'devolve a mesma venda');
select is((select count(*) from movimentacoes where tipo = 'entrada_troca' and origem_id = (select venda_id from t7)::text),
  1::bigint, 'o devolvido entrou uma vez só');

-- Busca do devolvido: traz também o que não está mais à venda
select is((select count(*) from buscar_para_venda('CX-1')), 0::bigint, 'a busca da venda não traz a Caixa inativa');
select is((select count(*) from buscar_para_venda('CX-1', true)), 1::bigint, 'a busca do devolvido traz');
select is((select jsonb_array_length(formas) from buscar_para_venda('CX-1', true)), 1, 'com a forma dela');

-- Cancelar uma troca (T12): estorna as saídas e a entrada do devolvido; o caixa perde só a diferença
select pg_temp.saldo('FM-1') as antes into temp saldo_antes;
select tests.sair();
select pg_temp.dinheiro_esperado() as antes into temp esperado_antes_cancelar;
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select cancelar_venda((select venda_id from t1), 'cliente desistiu');
select is(pg_temp.saldo('FM-1'), (select antes from saldo_antes) + 100, 'voltam 200 un levadas e saem 100 devolvidas');
select is((select count(*) from movimentacoes e join movimentacoes m on m.id = e.estorno_de
  where m.tipo = 'entrada_troca' and m.origem_id = (select venda_id from t1)::text), 1::bigint, 'a entrada do devolvido foi estornada');
select is((select situacao::text from vendas where id = (select venda_id from t1)), 'cancelada', 'a troca está cancelada');
select tests.sair();
select is(pg_temp.dinheiro_esperado(), (select antes from esperado_antes_cancelar) - 1500, 'o caixa perde só a diferença paga');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

-- A entrada do devolvido só sai pelo cancelamento
select throws_ok(
  format($$select estornar_movimentacao(%s, 'teste')$$,
    (select id from movimentacoes where tipo = 'entrada_troca' and origem_id = (select venda_id from t2)::text)),
  'P0001', 'Movimentação de venda só sai pelo cancelamento da venda.', 'estorno direto da entrada de troca');

-- O devolvido já vendido de novo impede o cancelamento
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
create temp table t8 as select * from registrar_venda(
  pg_temp.item(pg_temp.pacote(), 1), 0, pg_temp.pix(1450), 1500, null, pg_temp.dev(pg_temp.forma('TP-1', 'Unidade'), 1), 50);
select * from registrar_venda(pg_temp.item(pg_temp.forma('TP-1', 'Unidade'), 1), 0, pg_temp.pix(50), 50);
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select throws_ok(
  format($$select cancelar_venda(%s, 'teste')$$, (select venda_id from t8)),
  'P0001', 'O produto devolvido na troca já saiu do estoque: não dá para cancelar esta venda.', 'devolvido já vendido de novo');
select is((select situacao::text from vendas where id = (select venda_id from t8)), 'concluida', 'a troca continua concluída');
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');

-- Ninguém grava o devolvido direto
select throws_ok(
  format($$insert into venda_devolucoes (venda_id, variacao_id, forma_venda_id, quantidade, quantidade_base, preco_unitario_centavos, total_centavos)
    values (%s, %L, %L, 1, 1, 1, 1)$$, (select venda_id from t1), pg_temp.var('FM-1'), pg_temp.forma('FM-1', 'Unidade')),
  '42501', null, 'sem escrita direta no devolvido');

select * from finish();
rollback;
