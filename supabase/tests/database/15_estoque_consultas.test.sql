-- Estoque, parte 6: busca da tela de estoque, alertas, avisos do Início e conferência diária (R2).
begin;
select plan(17);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true}');
insert into ids select 'caixa', criar_produto('{"nome":"Caixa","tipo_venda":"unidade"}');
insert into ids select 'pote', criar_produto('{"nome":"Pote","tipo_venda":"unidade"}');
insert into ids select 'tampa', criar_produto('{"nome":"Tampa","tipo_venda":"unidade"}');
insert into ids select 'var_' || i.nome, v.id from ids i join variacoes v on v.produto_id = i.id;
update variacoes set estoque_minimo = 500 where id = (select id from ids where nome = 'var_granulado');
update variacoes set estoque_minimo = 5 where id = (select id from ids where nome = 'var_caixa');
update variacoes set estoque_minimo = 10 where id = (select id from ids where nome = 'var_pote');
update produtos set inativo = true where id = (select id from ids where nome = 'pote');

-- Granulado: vence em 5 dias (100 g), em 20 (100 g), em 40 (100 g), em 5 sem saldo, vencido (50 g),
-- vencido sem saldo. Caixa: 10 un. Forminha: 10 un.
select tests.sair();
with l as (insert into lotes (variacao_id, codigo, validade) values
  ((select id from ids where nome = 'var_granulado'), 'V5', hoje_sp() + 5),
  ((select id from ids where nome = 'var_granulado'), 'V20', hoje_sp() + 20),
  ((select id from ids where nome = 'var_granulado'), 'V40', hoje_sp() + 40),
  ((select id from ids where nome = 'var_granulado'), 'Z5', hoje_sp() + 5),
  ((select id from ids where nome = 'var_granulado'), 'VELHO', hoje_sp() - 1),
  ((select id from ids where nome = 'var_granulado'), 'VELHO0', hoje_sp() - 2) returning id, codigo)
insert into ids select codigo, id from l;
insert into ids select 'geral_caixa', lote_geral((select id from ids where nome = 'var_caixa'));
insert into ids select 'geral_forminha', lote_geral((select id from ids where nome = 'var_forminha'));
select movimentar_lote(id, 'ajuste_manual', q, 'estoque inicial', '00000000-0000-0000-0000-00000000000a')
from (values ('V5', 100), ('V20', 100), ('V40', 100), ('Z5', 10), ('VELHO', 50), ('VELHO0', 10),
             ('geral_caixa', 10), ('geral_forminha', 10)) as e (nome, q)
join ids using (nome);
select movimentar_lote(id, 'perda_vencimento', -10, 'zerar', '00000000-0000-0000-0000-00000000000a')
from ids where nome = 'VELHO0';
select movimentar_lote(id, 'ajuste_manual', -10, 'zerar', '00000000-0000-0000-0000-00000000000a')
from ids where nome = 'Z5';
insert into solicitacoes_ajuste (variacao_id, lote_id, tipo, quantidade, motivo, solicitado_por) values
  ((select id from ids where nome = 'var_caixa'), (select id from ids where nome = 'geral_caixa'), 'perda_avaria', -1,
   'da funcionária', '00000000-0000-0000-0000-00000000000b'),
  ((select id from ids where nome = 'var_caixa'), (select id from ids where nome = 'geral_caixa'), 'perda_avaria', -1,
   'de outra pessoa', '00000000-0000-0000-0000-00000000000c');

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

-- Busca da tela de estoque
select is((select count(*) from buscar_estoque('forminha')), 1::bigint, 'acha pelo nome');
select is((select produto from buscar_estoque(lower((select codigo_interno from variacoes where id = (select id from ids where nome = 'var_caixa'))))),
  'Caixa', 'acha pelo código interno, sem diferenciar maiúsculas');
select is((select count(*) from buscar_estoque(null, true)), 3::bigint, 'só com saldo: Granulado, Caixa e Forminha');
select results_eq(
  $$select saldo_total, saldo_disponivel, proxima_validade from buscar_estoque('granulado')$$,
  $$values (350::bigint, 300::bigint, hoje_sp() + 5)$$,
  'disponível não conta o vencido; próxima validade é a do lote não vencido com saldo');
select is((select total from buscar_estoque(null, false, 1, 0) limit 1), 5::bigint, 'total ignora a paginação');

-- Alertas
select results_eq(
  $$select lote, faixa_dias, dias_para_vencer from alertas_estoque() where tipo = 'vencendo' order by validade$$,
  $$values ('V5'::text, 7, 5), ('V20'::text, 30, 20)$$,
  'vencendo: só lotes com saldo, até 30 dias, com a faixa');
select results_eq(
  $$select lote from alertas_estoque() where tipo = 'vencido'$$,
  $$values ('VELHO'::text)$$,
  'vencido com saldo');
select results_eq(
  $$select produto from alertas_estoque() where tipo = 'abaixo_minimo'$$,
  $$values ('Granulado'::text)$$,
  'abaixo do mínimo: só variação ativa de produto não inativo, com mínimo maior que zero');

-- Conferência diária
select tests.sair();
select conferir_integridade_estoque();
select is((select divergencias from verificacoes_integridade order by id desc limit 1), '[]'::jsonb, 'tudo certo: sem divergências');
update saldos set quantidade = quantidade + 1 where lote_id = (select id from ids where nome = 'V5');
select conferir_integridade_estoque();
select is((select jsonb_array_length(divergencias) from verificacoes_integridade order by id desc limit 1), 1,
  'saldo mexido por fora: uma divergência');
select is((select divergencias -> 0 ->> 'lote_id' from verificacoes_integridade order by id desc limit 1),
  (select id from ids where nome = 'V5')::text, 'aponta o lote');
select is((select schedule from cron.job where jobname = 'conferir-estoque'), '0 6 * * *', 'roda todo dia às 03:00 de São Paulo');

-- Avisos do Início
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select results_eq(
  $$select vencendo, faixa_maior, vencidos, abaixo_minimo from avisos_inicio()$$,
  $$values (2, 30, 1, 1)$$,
  'contagens dos alertas');
select is((select solicitacoes_pendentes from avisos_inicio()), 2, 'administradora: todas as pendentes');
select ok((select conferencia_em is not null and conferencia_divergencias = 1 from avisos_inicio()),
  'administradora vê a última conferência');
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select results_eq(
  $$select conferencia_em, conferencia_divergencias from avisos_inicio()$$,
  $$values (null::timestamptz, null::integer)$$,
  'funcionária não vê a conferência');
select is((select solicitacoes_pendentes from avisos_inicio()), 1, 'funcionária: só as dela');

select * from finish();
rollback;
