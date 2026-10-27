-- Estoque, parte 5: saída "vence primeiro, sai primeiro" (R3), sem lote vencido (R4), para a venda da fase 2.
begin;
select plan(11);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true}');
insert into ids select 'confeito', criar_produto('{"nome":"Confeito","tipo_venda":"peso","controla_validade":true}');
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'var_' || i.nome, v.id from ids i join variacoes v on v.produto_id = i.id;

-- Granulado: A 200 g (vence em 10 dias), B 5.000 g (em 70 dias), C 1.000 g (vencido).
-- Confeito: D e E com a mesma validade; D foi criado antes. Forminha: 30 un no GERAL.
select tests.sair();
with l as (insert into lotes (variacao_id, codigo, validade) values
  ((select id from ids where nome = 'var_granulado'), 'A', hoje_sp() + 10),
  ((select id from ids where nome = 'var_granulado'), 'B', hoje_sp() + 70),
  ((select id from ids where nome = 'var_granulado'), 'C', hoje_sp() - 1) returning id, codigo)
insert into ids select codigo, id from l;
with l as (insert into lotes (variacao_id, codigo, validade, criado_em) values
  ((select id from ids where nome = 'var_confeito'), 'D', hoje_sp() + 100, now() - interval '1 day'),
  ((select id from ids where nome = 'var_confeito'), 'E', hoje_sp() + 100, now()) returning id, codigo)
insert into ids select codigo, id from l;
insert into ids select 'geral', lote_geral((select id from ids where nome = 'var_forminha'));
select movimentar_lote(id, 'ajuste_manual', q, 'estoque inicial', '00000000-0000-0000-0000-00000000000a')
from (values ('A', 200), ('B', 5000), ('C', 1000), ('D', 100), ('E', 100), ('geral', 30)) as e (nome, q)
join ids using (nome);

select results_eq(
  $$select lote_id, quantidade from retirar_fefo((select id from ids where nome = 'var_granulado'), 350,
      'ajuste_manual', 'venda de teste', '00000000-0000-0000-0000-00000000000a')$$,
  $$values ((select id from ids where nome = 'A'), 200::bigint), ((select id from ids where nome = 'B'), 150::bigint)$$,
  'retirar 350 g: 200 do A e 150 do B, pulando o vencido');
select results_eq(
  $$select l.codigo, s.quantidade from saldos s join lotes l on l.id = s.lote_id
    where s.variacao_id = (select id from ids where nome = 'var_granulado') order by l.codigo$$,
  $$values ('A'::text, 0::bigint), ('B'::text, 4850::bigint), ('C'::text, 1000::bigint)$$,
  'saldos depois da saída');
select is(
  (select count(*) from movimentacoes where variacao_id = (select id from ids where nome = 'var_granulado') and quantidade < 0),
  2::bigint, 'uma movimentação por lote');
select throws_ok(
  $$select * from retirar_fefo((select id from ids where nome = 'var_granulado'), 6000,
      'ajuste_manual', 'venda de teste', '00000000-0000-0000-0000-00000000000a')$$,
  'P0001', 'Saldo insuficiente: há 4850 g fora de lotes vencidos.', 'pedir mais do que há fora dos vencidos');
select is((select quantidade from saldos where lote_id = (select id from ids where nome = 'B')), 4850::bigint, 'nada muda');
select results_eq(
  $$select lote_id, quantidade from retirar_fefo((select id from ids where nome = 'var_confeito'), 50,
      'ajuste_manual', 'venda de teste', '00000000-0000-0000-0000-00000000000a')$$,
  $$values ((select id from ids where nome = 'D'), 50::bigint)$$,
  'mesma validade: sai primeiro o lote criado antes');
select throws_ok(
  $$select * from retirar_fefo((select id from ids where nome = 'var_forminha'), 31,
      'ajuste_manual', 'venda de teste', '00000000-0000-0000-0000-00000000000a')$$,
  'P0001', 'Saldo insuficiente: há 30 un fora de lotes vencidos.', 'saldo 30 e retirada de 31');
select is((select quantidade from saldos where lote_id = (select id from ids where nome = 'geral')), 30::bigint, 'saldo continua 30');
select results_eq(
  $$select lote_id, quantidade from retirar_fefo((select id from ids where nome = 'var_forminha'), 10,
      'ajuste_manual', 'venda de teste', '00000000-0000-0000-0000-00000000000a')$$,
  $$values ((select id from ids where nome = 'geral'), 10::bigint)$$,
  'produto sem validade sai do GERAL');
select throws_ok(
  $$select * from retirar_fefo((select id from ids where nome = 'var_forminha'), 0,
      'ajuste_manual', 'venda de teste', '00000000-0000-0000-0000-00000000000a')$$,
  'P0001', 'Informe uma quantidade inteira maior que zero.', 'quantidade zero');

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select throws_ok(
  $$select * from retirar_fefo((select id from ids where nome = 'var_forminha'), 1,
      'ajuste_manual', 'venda de teste', '00000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'função interna fechada para quem entra no site');

select * from finish();
rollback;
