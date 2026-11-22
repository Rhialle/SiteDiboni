-- Balcão, parte 2: a venda (preço, desconto, pagamento, saída pelo vencimento, venda sem saldo,
-- cancelamento) e o caixa contando as vendas.
begin;
select plan(43);

set constraints all immediate;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

-- Catálogo: Forminha N4 (unidade e "Pacote com 100" com faixa a partir de 3), Granulado (granel,
-- com validade), Tampa (para venda sem saldo), Pote (com validade, sem lote) e Caixa inativa.
select criar_produto('{"nome":"Forminha","tipo_venda":"unidade","variacao":{"nome":"N4","codigo_interno":"FM-1","codigo_barras":"7891000000014"}}');
select criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true,"variacao":{"nome":"Chocolate","codigo_interno":"GR-1"}}');
select criar_produto('{"nome":"Tampa","tipo_venda":"unidade","variacao":{"codigo_interno":"TP-1"}}');
select criar_produto('{"nome":"Pote","tipo_venda":"unidade","controla_validade":true,"variacao":{"codigo_interno":"PT-1"}}');
select criar_produto('{"nome":"Caixa","tipo_venda":"unidade","variacao":{"codigo_interno":"CX-1"}}');
create function pg_temp.var(p_codigo text) returns uuid language sql as $$ select id from variacoes where codigo_interno = p_codigo $$;
insert into formas_venda (variacao_id, nome, fator, preco_centavos) values
  (pg_temp.var('FM-1'), 'Unidade', 1, 20),
  (pg_temp.var('FM-1'), 'Pacote com 100', 100, 1500),
  (pg_temp.var('TP-1'), 'Unidade', 1, 50),
  (pg_temp.var('PT-1'), 'Unidade', 1, 300),
  (pg_temp.var('CX-1'), 'Unidade', 1, 100);
insert into formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel) values
  (pg_temp.var('GR-1'), 'Granel', 1000, 4000, true);
create function pg_temp.forma(p_codigo text, p_nome text) returns uuid language sql as $$
  select id from formas_venda where variacao_id = pg_temp.var(p_codigo) and nome = p_nome
$$;
insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values (pg_temp.forma('FM-1', 'Pacote com 100'), 3, 1350);
update formas_venda set codigo_barras = '7891000000021' where id = pg_temp.forma('FM-1', 'Pacote com 100');
update produtos set inativo = true where id = (select produto_id from variacoes where id = pg_temp.var('CX-1'));

-- Estoque: Forminha 1000 un; Granulado L-A 200 g (vence antes), L-B 5000 g e L-V 50 g vencido; Tampa 2 un.
select registrar_entrada_manual(pg_temp.var('FM-1'), 1000, 0.05, 'compra');
select registrar_entrada_manual(pg_temp.var('GR-1'), 200, 0.03, 'compra', hoje_sp() + 10, 'L-A');
select registrar_entrada_manual(pg_temp.var('GR-1'), 5000, 0.03, 'compra', hoje_sp() + 60, 'L-B');
select registrar_entrada_manual(pg_temp.var('TP-1'), 2, 0.10, 'compra');
select tests.sair();
select entrar_no_estoque(pg_temp.var('GR-1'), 50, 0.03, hoje_sp() - 1, 'L-V', 'entrada_manual', 'vencido',
  '00000000-0000-0000-0000-00000000000a');

create function pg_temp.saldo(p_codigo text) returns bigint language sql as $$
  select coalesce(sum(quantidade), 0) from saldos where variacao_id = pg_temp.var(p_codigo)
$$;
create function pg_temp.saldo_lote(p_codigo text, p_lote text) returns bigint language sql as $$
  select coalesce((select s.quantidade from saldos s join lotes l on l.id = s.lote_id
    where s.variacao_id = pg_temp.var(p_codigo) and l.codigo = p_lote), 0)
$$;
create function pg_temp.item(p_forma uuid, p_qtd integer, p_validade text default null) returns jsonb language sql as $$
  select jsonb_build_object('forma_venda_id', p_forma, 'quantidade', p_qtd, 'validade_sem_saldo', p_validade)
$$;
create function pg_temp.pix(p_valor integer) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor_centavos', p_valor))
$$;

-- Sem caixa aberto, não vende
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select throws_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 1)), 0, pg_temp.pix(20), 20)$$, pg_temp.forma('FM-1', 'Unidade')),
  'P0001', 'Abra o caixa antes de vender.', 'sem caixa aberto');
select abrir_caixa(5000);

-- Preço recalculado: 3 pacotes com faixa a partir de 3 → R$ 40,50; total diferente é recusado
select throws_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 3)), 0, pg_temp.pix(4051), 4051)$$,
    pg_temp.forma('FM-1', 'Pacote com 100')),
  'P0001', 'O total da venda mudou: confira os preços e tente de novo.', 'total diferente do calculado');
select is((select count(*) from vendas), 0::bigint, 'nada foi gravado');
create temp table v1 as select * from registrar_venda(
  jsonb_build_array(pg_temp.item(pg_temp.forma('FM-1', 'Pacote com 100'), 3)), 0,
  jsonb_build_array(jsonb_build_object('forma', 'dinheiro', 'valor_centavos', 4050, 'recebido_centavos', 5000)), 4050);
select is((select numero from v1), 1::bigint, 'a primeira venda tem o número 1');
select is((select troco_centavos from v1), 950, 'troco de R$ 9,50 para R$ 50,00');
select results_eq($$select preco_unitario_centavos, total_centavos, quantidade_base from venda_itens where venda_id = (select venda_id from v1)$$,
  $$values (1350, 4050, 300::bigint)$$, 'faixa aplicada e 300 unidades base');
select is(pg_temp.saldo('FM-1'), 700::bigint, 'saíram 300 un da Forminha');
select is((select motivo from movimentacoes where origem = 'venda' and origem_id = (select venda_id from v1)::text),
  'Venda nº 1', 'a saída tem o motivo com o número da venda');

-- Granel: 350 g a R$ 40/kg = R$ 14,00; sai 200 g do L-A e 150 g do L-B, nada do vencido
create temp table v2 as select * from registrar_venda(
  jsonb_build_array(pg_temp.item(pg_temp.forma('GR-1', 'Granel'), 350)), 0, pg_temp.pix(1400), 1400);
select is(pg_temp.saldo_lote('GR-1', 'L-A'), 0::bigint, 'L-A (vence antes) zerou');
select is(pg_temp.saldo_lote('GR-1', 'L-B'), 4850::bigint, 'L-B deu os outros 150 g');
select is(pg_temp.saldo_lote('GR-1', 'L-V'), 50::bigint, 'o lote vencido não saiu');

-- Venda sem saldo: Tampa com 2 un, venda de 5 → entra 3 e saem 5; o saldo termina em 0
create temp table v3 as select * from registrar_venda(
  jsonb_build_array(pg_temp.item(pg_temp.forma('TP-1', 'Unidade'), 5)), 0, pg_temp.pix(250), 250);
select is(pg_temp.saldo('TP-1'), 0::bigint, 'saldo da Tampa termina em zero, nunca negativo');
select is((select quantidade from movimentacoes where tipo = 'entrada_venda_sem_saldo' and origem_id = (select venda_id from v3)::text),
  3::bigint, 'entrada da falta de 3 un');
select is((select motivo from movimentacoes where tipo = 'entrada_venda_sem_saldo' and origem_id = (select venda_id from v3)::text),
  'Venda sem saldo nº 3', 'com o motivo da venda sem saldo');
select is((select quantidade_sem_saldo_base from venda_itens where venda_id = (select venda_id from v3)), 3::bigint,
  'o item guarda a quantidade sem saldo');

-- Granel com saldo válido menor que o pedido: só a falta além dos válidos entra
create temp table v4 as select * from registrar_venda(
  jsonb_build_array(pg_temp.item(pg_temp.forma('GR-1', 'Granel'), 5000)), 0, pg_temp.pix(20000), 20000);
select is((select quantidade_sem_saldo_base from venda_itens where venda_id = (select venda_id from v4)), 150::bigint,
  'faltavam 150 g além dos 4850 g válidos');
select is(pg_temp.saldo_lote('GR-1', 'L-V'), 50::bigint, 'o vencido continua fora');

-- Produto com validade sem lote válido: sem a validade da embalagem, recusa; com ela, cria VSS
select throws_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 1)), 0, pg_temp.pix(300), 300)$$, pg_temp.forma('PT-1', 'Unidade')),
  'P0001', 'Informe a validade da embalagem de Pote – Padrão.', 'pede a validade da embalagem');
select lives_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 1, %L)), 0, pg_temp.pix(300), 300)$$,
    pg_temp.forma('PT-1', 'Unidade'), (hoje_sp() + 90)::text),
  'com a validade, vende');
select is((select codigo from lotes where variacao_id = pg_temp.var('PT-1')), 'VSS-' || to_char(hoje_sp(), 'YYYY-MM-DD'),
  'o lote criado é o VSS do dia');

-- Desconto: a funcionária até 10%; o administrador sem limite
select throws_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 3)), 446, pg_temp.pix(3604), 3604)$$,
    pg_temp.forma('FM-1', 'Pacote com 100')),
  'P0001', 'Desconto acima de 10%: só o administrador pode dar.', 'desconto de 11% pela funcionária');
select lives_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 3)), 405, pg_temp.pix(3645), 3645)$$,
    pg_temp.forma('FM-1', 'Pacote com 100')),
  'desconto de 10% pela funcionária');

-- Pagamentos
select throws_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 1)), 0, pg_temp.pix(10), 20)$$, pg_temp.forma('FM-1', 'Unidade')),
  'P0001', 'A soma dos pagamentos não bate com o total.', 'pagamento menor que o total');
select throws_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 1)), 0,
    jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor_centavos', 20, 'recebido_centavos', 50)), 20)$$, pg_temp.forma('FM-1', 'Unidade')),
  'P0001', 'Só o pagamento em dinheiro tem troco.', 'troco no Pix');
select throws_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 1)), 0,
    jsonb_build_array(jsonb_build_object('forma', 'dinheiro', 'valor_centavos', 20, 'recebido_centavos', 10)), 20)$$, pg_temp.forma('FM-1', 'Unidade')),
  'P0001', 'O valor recebido em dinheiro é menor que o valor a pagar.', 'dinheiro recebido a menos');
create temp table v5 as select * from registrar_venda(
  jsonb_build_array(pg_temp.item(pg_temp.forma('FM-1', 'Pacote com 100'), 3)), 0,
  jsonb_build_array(
    jsonb_build_object('forma', 'pix', 'valor_centavos', 2000),
    jsonb_build_object('forma', 'cartao_credito', 'valor_centavos', 2050)), 4050);
select is((select count(*) from venda_pagamentos where venda_id = (select venda_id from v5)), 2::bigint, 'venda dividida em Pix e crédito');

-- Produto inativo não vende
select throws_ok(
  format($$select * from registrar_venda(jsonb_build_array(pg_temp.item(%L, 1)), 0, pg_temp.pix(100), 100)$$, pg_temp.forma('CX-1', 'Unidade')),
  'P0001', 'Caixa – Padrão não está à venda.', 'produto inativo');

-- A busca da tela de venda
select is((select forma_exata from buscar_para_venda('7891000000021')), pg_temp.forma('FM-1', 'Pacote com 100'),
  'o código do pacote devolve a forma exata');
select is((select codigo_interno from buscar_para_venda('7891000000014')), 'FM-1', 'o código da unidade devolve a variação');
select is((select codigo_interno from buscar_para_venda('fm-1')), 'FM-1', 'o código interno devolve a variação');
select is((select count(*) from buscar_para_venda('forminha')), 1::bigint, 'a busca pelo nome acha a Forminha');
select is((select count(*) from buscar_para_venda('caixa')), 0::bigint, 'produto inativo não aparece');
select ok((select so_vencido from buscar_para_venda('granulado')), 'o Granulado ficou só com estoque vencido (aviso da tela)');

-- A funcionária não lê o custo da venda
select is((select count(*) from movimentacoes_custos), 0::bigint, 'a funcionária não lê custos');

-- Cancelar: só o administrador; o estoque volta; não cancela duas vezes; o estorno avulso não pega venda
select throws_ok(format($$select cancelar_venda(%s, 'erro')$$, (select venda_id from v3)), 'P0001',
  'Você não tem permissão para acessar esta página.', 'a funcionária não cancela');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select is((select count(*) from vendas_sem_saldo()), 2::bigint, 'duas vendas sem saldo a conferir');
select throws_ok(
  format($$select estornar_movimentacao(%s, 'errado')$$,
    (select id from movimentacoes where tipo = 'venda' and origem_id = (select venda_id from v3)::text)),
  'P0001', 'Movimentação de venda só sai pelo cancelamento da venda.', 'estorno avulso de venda é recusado');
select lives_ok(format($$select cancelar_venda(%s, 'cliente desistiu')$$, (select venda_id from v3)), 'o administrador cancela a venda sem saldo');
select is(pg_temp.saldo('TP-1'), 2::bigint, 'a Tampa volta ao saldo de antes da venda');
select is((select count(*) from vendas_sem_saldo()), 1::bigint, 'a venda cancelada sai da lista');
select throws_ok(format($$select cancelar_venda(%s, 'de novo')$$, (select venda_id from v3)), 'P0001',
  'Esta venda já foi cancelada.', 'não cancela duas vezes');
select ok((select count(*) from movimentacoes_custos mc join movimentacoes m on m.id = mc.movimentacao_id
  where m.tipo = 'venda') > 0, 'as saídas da venda guardam o custo (o administrador lê)');

-- O caixa: esperado com as vendas concluídas, sem a cancelada
create temp table fechamento as select * from fechar_caixa(9050, 2050, null, null);
select results_eq(
  $$select forma::text, esperado_centavos from fechamento order by forma$$,
  $$values ('dinheiro', 9050), ('cartao_credito', 2050), ('cartao_debito', 0), ('pix', 27345)$$,
  'esperado: troco + dinheiro das vendas; crédito; Pix das vendas, sem a cancelada');

select * from finish();
rollback;
