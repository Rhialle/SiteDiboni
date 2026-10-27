-- Estoque, parte 4: estorno (R2), custo médio no estorno de entrada (R9) e extrato.
begin;
select plan(25);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
create temp table mov (nome text primary key, id bigint);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'caixa', criar_produto('{"nome":"Caixa","tipo_venda":"unidade"}');
insert into ids select 'pote', criar_produto('{"nome":"Pote","tipo_venda":"unidade"}');
insert into ids select 'tampa', criar_produto('{"nome":"Tampa","tipo_venda":"unidade"}');
insert into ids select 'var_' || i.nome, v.id from ids i join variacoes v on v.produto_id = i.id;

create temp view saldo_de as
select i.nome, coalesce(sum(s.quantidade), 0)::bigint as total
from ids i left join saldos s on s.variacao_id = i.id
where i.nome like 'var_%'
group by i.nome;

create temp view custo_de as
select i.nome, c.custo_medio from ids i join custos_variacao c on c.variacao_id = i.id;

-- Estorno de entrada: saldo volta e o custo médio tira aquela entrada
insert into mov select 'E1', registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 100, 0.05, 'compra');
insert into mov select 'E2', registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 300, 0.09, 'compra');
select lives_ok($$select estornar_movimentacao((select id from mov where nome = 'E2'), 'quantidade errada')$$, 'estorna a 2ª entrada');
select is((select total from saldo_de where nome = 'var_forminha'), 100::bigint, 'saldo volta a 100');
select is((select custo_medio from custo_de where nome = 'var_forminha'), 0.05::numeric, '(400 × 0,08 − 300 × 0,09) ÷ 100 = 0,05');
select is((select estornada from extrato_movimentacoes where id = (select id from mov where nome = 'E2')), true,
  'a entrada aparece como estornada');
select results_eq(
  $$select tipo::text, quantidade, estorno_de from movimentacoes where estorno_de = (select id from mov where nome = 'E2')$$,
  $$select 'estorno'::text, -300::bigint, id from mov where nome = 'E2'$$,
  'o estorno tem a quantidade oposta e aponta para a original');
select throws_ok($$select estornar_movimentacao((select id from mov where nome = 'E2'), 'de novo')$$,
  'P0001', 'Esta movimentação já foi estornada.', 'estorno duplo');
select throws_ok(
  $$select estornar_movimentacao((select id from movimentacoes where estorno_de = (select id from mov where nome = 'E2')), 'desfazer')$$,
  'P0001', 'Um estorno não pode ser estornado.', 'estorno de estorno');

-- Estorno de entrada da qual parte já saiu: recusado
insert into mov select 'C1', registrar_entrada_manual((select id from ids where nome = 'var_caixa'), 100, 0.05, 'compra');
select registrar_perda_ou_ajuste((select id from ids where nome = 'var_caixa'), null, 'perda_avaria', -60, 'molhou');
insert into mov select 'P1', max(id) from movimentacoes;
select throws_ok($$select estornar_movimentacao((select id from mov where nome = 'C1'), 'nota errada')$$,
  'P0001', 'Saldo insuficiente: há 40 un neste lote.', 'estorno que deixaria o saldo negativo');
select is((select total from saldo_de where nome = 'var_caixa'), 40::bigint, 'saldo continua 40');
select is((select custo_medio from custo_de where nome = 'var_caixa'), 0.05::numeric, 'custo médio continua 0,05');
select lives_ok($$select estornar_movimentacao((select id from mov where nome = 'P1'), 'não molhou')$$, 'estorna a perda');
select is((select total from saldo_de where nome = 'var_caixa'), 100::bigint, 'saldo volta a 100');
select is((select custo_medio from custo_de where nome = 'var_caixa'), 0.05::numeric, 'estorno de perda não mexe no custo');

-- Estorno que zera o saldo: o custo médio anterior fica
insert into mov select 'U1', registrar_entrada_manual((select id from ids where nome = 'var_pote'), 100, 0.05, 'compra');
select lives_ok($$select estornar_movimentacao((select id from mov where nome = 'U1'), 'devolvido')$$, 'estorna a única entrada');
select is((select total from saldo_de where nome = 'var_pote'), 0::bigint, 'saldo zero');
select is((select custo_medio from custo_de where nome = 'var_pote'), 0.05::numeric, 'saldo restante zero: custo médio fica');

-- Estorno cujo recálculo daria negativo: o custo médio anterior fica
insert into mov select 'T1', registrar_entrada_manual((select id from ids where nome = 'var_tampa'), 100, 0.01, 'compra');
insert into mov select 'T2', registrar_entrada_manual((select id from ids where nome = 'var_tampa'), 100, 0.10, 'compra');
select registrar_perda_ou_ajuste((select id from ids where nome = 'var_tampa'), null, 'perda_avaria', -90, 'quebrou');
select is((select custo_medio from custo_de where nome = 'var_tampa'), 0.055::numeric, 'médio 0,055 antes');
select lives_ok($$select estornar_movimentacao((select id from mov where nome = 'T2'), 'cobrado a mais')$$, 'estorna a 2ª entrada');
select is((select total from saldo_de where nome = 'var_tampa'), 10::bigint, 'saldo 10');
select is((select custo_medio from custo_de where nome = 'var_tampa'), 0.055::numeric,
  '(110 × 0,055 − 100 × 0,10) ÷ 10 daria negativo: custo médio fica');

-- Motivo, extrato e permissões
select throws_ok($$select estornar_movimentacao((select id from mov where nome = 'E1'), ' ')$$,
  'P0001', 'Informe o motivo.', 'estorno sem motivo');
select is((select usuario from extrato_movimentacoes where id = (select id from mov where nome = 'E1')), 'dona',
  'o extrato mostra quem fez');
select is((select lote from extrato_movimentacoes where id = (select id from mov where nome = 'E1')), null::text,
  'o lote GERAL não aparece');

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select throws_ok($$select estornar_movimentacao((select id from mov where nome = 'E1'), 'teste')$$,
  'P0001', 'Você não tem permissão para acessar esta página.', 'funcionária não estorna');
select ok((select count(*) from extrato_movimentacoes) > 0, 'funcionária lê o extrato');

select * from finish();
rollback;
