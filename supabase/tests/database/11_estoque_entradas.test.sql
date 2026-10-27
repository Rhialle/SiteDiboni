-- Estoque, parte 2: entrada manual, lotes da entrada (R7) e custo médio (R9).
begin;
select plan(29);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true}');
insert into ids select 'caixa', criar_produto('{"nome":"Caixa","tipo_venda":"unidade"}');
insert into ids select 'tampa', criar_produto('{"nome":"Tampa","tipo_venda":"unidade"}');
insert into ids select 'var_' || i.nome, v.id from ids i join variacoes v on v.produto_id = i.id;

create temp view saldo_de as
select i.nome, coalesce(sum(s.quantidade), 0)::bigint as total
from ids i left join saldos s on s.variacao_id = i.id
where i.nome like 'var_%'
group by i.nome;

-- Produto sem validade: tudo no lote GERAL, custo médio ponderado (R9)
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 100, 0.05, 'compra no atacado')$$,
  'entrada de 100 a 0,05');
select results_eq(
  $$select l.codigo, s.quantidade from saldos s join lotes l on l.id = s.lote_id
    where s.variacao_id = (select id from ids where nome = 'var_forminha')$$,
  $$values ('GERAL'::text, 100::bigint)$$,
  'lote GERAL com 100');
select is((select custo_medio from custos_variacao where variacao_id = (select id from ids where nome = 'var_forminha')),
  0.05::numeric, 'custo médio 0,05');
select results_eq(
  $$select m.tipo::text, m.motivo, mc.custo_unitario from movimentacoes m join movimentacoes_custos mc on mc.movimentacao_id = m.id
    where m.variacao_id = (select id from ids where nome = 'var_forminha')$$,
  $$values ('entrada_manual'::text, 'compra no atacado'::text, 0.05::numeric)$$,
  'movimentação com tipo, motivo e custo');
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 300, 0.09, 'compra')$$,
  'entrada de 300 a 0,09');
select is((select total from saldo_de where nome = 'var_forminha'), 400::bigint, 'saldo 400');
select is((select custo_medio from custos_variacao where variacao_id = (select id from ids where nome = 'var_forminha')),
  0.08::numeric, '(100 × 0,05 + 300 × 0,09) ÷ 400 = 0,08');

-- Produto com validade (R7)
select throws_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_granulado'), 500, 0.03, 'compra')$$,
  'P0001', 'Informe a validade: este produto controla validade.', 'sem validade');
select throws_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_granulado'), 500, 0.03, 'compra', hoje_sp() - 1)$$,
  'P0001', 'A validade informada já passou.', 'validade de ontem');
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_granulado'), 500, 0.03, 'compra', hoje_sp() + 60)$$,
  'sem código: gera o do dia');
select ok(exists (select 1 from lotes where variacao_id = (select id from ids where nome = 'var_granulado')
  and codigo = 'ENT-' || to_char(hoje_sp(), 'YYYY-MM-DD')), 'lote ENT de hoje');
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_granulado'), 500, 0.03, 'compra', hoje_sp() + 60)$$,
  'de novo sem código');
select ok(exists (select 1 from lotes where variacao_id = (select id from ids where nome = 'var_granulado')
  and codigo = 'ENT-' || to_char(hoje_sp(), 'YYYY-MM-DD') || '-2'), 'segundo lote do dia ganha -2');
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_granulado'), 200, 0.03, 'compra', hoje_sp() + 60, 'L1')$$,
  'lote L1');
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_granulado'), 300, 0.03, 'compra', hoje_sp() + 60, ' L1 ')$$,
  'L1 de novo, com espaços');
select is(
  (select s.quantidade from saldos s join lotes l on l.id = s.lote_id
   where l.variacao_id = (select id from ids where nome = 'var_granulado') and l.codigo = 'L1'),
  500::bigint, 'mesmo código soma no mesmo lote');
select throws_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_granulado'), 100, 0.03, 'compra', hoje_sp() + 90, 'L1')$$,
  'P0001', 'O lote L1 já existe com validade ' || to_char(hoje_sp() + 60, 'DD/MM/YYYY') || '.', 'L1 com outra validade');
select is(
  (select s.quantidade from saldos s join lotes l on l.id = s.lote_id
   where l.variacao_id = (select id from ids where nome = 'var_granulado') and l.codigo = 'L1'),
  500::bigint, 'nada muda');

-- Custo, motivo e quantidade
select throws_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 10, null, 'brinde')$$,
  'P0001', 'Informe o custo (brinde ou amostra entra com 0,00).', 'sem custo');
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 10, 0, 'brinde do fornecedor')$$,
  'brinde a 0,00');
select throws_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 10, 0.05, '  ')$$,
  'P0001', 'Informe o motivo.', 'sem motivo');
select throws_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 0, 0.05, 'compra')$$,
  'P0001', 'Informe uma quantidade inteira maior que zero.', 'quantidade zero');

-- Custo médio quando o saldo zerou e quando não havia custo
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_caixa'), 100, 0.10, 'compra')$$,
  'caixa: 100 a 0,10');
select tests.sair();
select movimentar_lote(lote_geral((select id from ids where nome = 'var_caixa')), 'ajuste_manual', -100, 'zerar',
  '00000000-0000-0000-0000-00000000000a');
select movimentar_lote(lote_geral((select id from ids where nome = 'var_tampa')), 'ajuste_manual', 40, 'achado sem custo',
  '00000000-0000-0000-0000-00000000000a');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_caixa'), 50, 0.20, 'compra')$$,
  'caixa: 50 a 0,20 com saldo zero');
select is((select custo_medio from custos_variacao where variacao_id = (select id from ids where nome = 'var_caixa')),
  0.20::numeric, 'com saldo zero, o custo médio é o da entrada');
select lives_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_tampa'), 10, 0.30, 'compra')$$,
  'tampa: 10 a 0,30 com 40 sem custo');
select is((select custo_medio from custos_variacao where variacao_id = (select id from ids where nome = 'var_tampa')),
  0.30::numeric, 'sem custo médio anterior, a entrada define o custo médio');

-- Permissões
select throws_ok(
  $$select entrar_no_estoque((select id from ids where nome = 'var_forminha'), 10, 0.05, null, null, 'entrada_manual', 'x',
    '00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'função interna fechada para quem entra no site');
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select throws_ok(
  $$select registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 10, 0.05, 'compra')$$,
  'P0001', 'Você não tem permissão para acessar esta página.', 'funcionária não dá entrada manual');

select * from finish();
rollback;
