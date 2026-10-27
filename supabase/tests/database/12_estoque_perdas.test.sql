-- Estoque, parte 3: perdas e ajustes (R5 e R8) e solicitações acima do limite.
begin;
select plan(32);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
create temp table sol (nome text primary key, id bigint);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true}');
insert into ids select 'caixa', criar_produto('{"nome":"Caixa","tipo_venda":"unidade"}');
insert into ids select 'var_' || i.nome, v.id from ids i join variacoes v on v.produto_id = i.id;

-- Criada ainda como administradora: a view temporária pertence a quem a cria.
create temp view saldo_de as
select i.nome, coalesce(sum(s.quantidade), 0)::bigint as total
from ids i left join saldos s on s.variacao_id = i.id
where i.nome like 'var_%'
group by i.nome;

-- Forminha: 3.000 un a 0,05 (custo médio 0,05). Limite padrão: 5000 centavos.
select registrar_entrada_manual((select id from ids where nome = 'var_forminha'), 3000, 0.05, 'estoque inicial');

-- Granulado: lote bom (300 g), lote com pouco (30 g) e lote vencido (100 g). Caixa: 50 un sem custo médio.
select tests.sair();
with l as (insert into lotes (variacao_id, codigo, validade)
  values ((select id from ids where nome = 'var_granulado'), 'BOM', hoje_sp() + 30) returning id)
insert into ids select 'bom', id from l;
with l as (insert into lotes (variacao_id, codigo, validade)
  values ((select id from ids where nome = 'var_granulado'), 'POUCO', hoje_sp() + 30) returning id)
insert into ids select 'pouco', id from l;
with l as (insert into lotes (variacao_id, codigo, validade)
  values ((select id from ids where nome = 'var_granulado'), 'VELHO', hoje_sp() - 1) returning id)
insert into ids select 'velho', id from l;
select movimentar_lote((select id from ids where nome = 'bom'), 'ajuste_manual', 300, 'teste', '00000000-0000-0000-0000-00000000000a');
select movimentar_lote((select id from ids where nome = 'pouco'), 'ajuste_manual', 30, 'teste', '00000000-0000-0000-0000-00000000000a');
select movimentar_lote((select id from ids where nome = 'velho'), 'ajuste_manual', 100, 'teste', '00000000-0000-0000-0000-00000000000a');
select movimentar_lote(lote_geral((select id from ids where nome = 'var_caixa')), 'ajuste_manual', 50, 'teste',
  '00000000-0000-0000-0000-00000000000a');
-- Uma solicitação de outra pessoa, que a funcionária não deve ver.
insert into solicitacoes_ajuste (variacao_id, lote_id, tipo, quantidade, motivo, solicitado_por)
values ((select id from ids where nome = 'var_caixa'), lote_geral((select id from ids where nome = 'var_caixa')),
  'perda_avaria', -1, 'de outra pessoa', '00000000-0000-0000-0000-00000000000c');

-- Administradora: sem limite, com as regras de cada tipo
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select is(registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'perda_avaria', -10, 'caiu no chão'),
  'registrada', 'administradora registra perda');
select is((select total from saldo_de where nome = 'var_forminha'), 2990::bigint, 'saldo 2990');
select is((select motivo from movimentacoes order by id desc limit 1), 'caiu no chão', 'motivo gravado');
select throws_ok(
  $$select registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'perda_avaria', -10, '  ')$$,
  'P0001', 'Informe o motivo.', 'sem motivo');
select throws_ok(
  $$select registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'perda_avaria', 10, 'achei')$$,
  'P0001', 'Perda e quebra só tiram do estoque.', 'perda para mais');
select throws_ok(
  $$select registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'quebra_pesagem', -10, 'balança')$$,
  'P0001', 'Quebra de pesagem é só para produto vendido por peso.', 'quebra em produto por unidade');
select is(
  registrar_perda_ou_ajuste((select id from ids where nome = 'var_granulado'), (select id from ids where nome = 'bom'),
    'quebra_pesagem', -5, 'sobra na balança'),
  'registrada', 'quebra em produto por peso');
select throws_ok(
  $$select registrar_perda_ou_ajuste((select id from ids where nome = 'var_granulado'), (select id from ids where nome = 'bom'),
    'perda_vencimento', -10, 'venceu')$$,
  'P0001', 'Perda por vencimento é só para lote vencido.', 'perda por vencimento em lote bom');
select is(
  registrar_perda_ou_ajuste((select id from ids where nome = 'var_granulado'), (select id from ids where nome = 'velho'),
    'perda_vencimento', -5, 'venceu'),
  'registrada', 'perda por vencimento em lote vencido');
select throws_ok(
  $$select registrar_perda_ou_ajuste((select id from ids where nome = 'var_granulado'), (select id from ids where nome = 'pouco'),
    'perda_avaria', -31, 'derramou')$$,
  'P0001', 'Saldo insuficiente: há 30 g neste lote.', 'saldo 30 e perda de 31');
select throws_ok(
  $$select registrar_perda_ou_ajuste((select id from ids where nome = 'var_granulado'), null, 'perda_avaria', -1, 'derramou')$$,
  'P0001', 'Escolha o lote.', 'produto com validade exige o lote (R5)');
select throws_ok(
  $$select registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), (select id from ids where nome = 'bom'),
    'perda_avaria', -1, 'derramou')$$,
  'P0001', 'Escolha o lote.', 'lote de outra variação');
select throws_ok(
  $$select registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'entrada_manual', 10, 'sem custo')$$,
  'P0001', 'Escolha o tipo: perda, quebra ou ajuste.', 'entrada não passa por aqui');

-- Funcionária: até o limite registra; acima (ou sem custo médio) vira solicitação
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select is(registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'perda_avaria', -1000, 'rasgou'),
  'registrada', '1.000 × 0,05 = R$ 50,00: não passa do limite');
select is(registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'perda_avaria', -1001, 'rasgou'),
  'solicitacao', '1.001 × 0,05 = R$ 50,05: vira solicitação');
insert into sol select 'A', max(id) from solicitacoes_ajuste;
select is((select total from saldo_de where nome = 'var_forminha'), 1990::bigint, 'a solicitação não muda o saldo');
select is(registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'ajuste_manual', 5, 'contei de novo'),
  'registrada', 'ajuste para mais dentro do limite');
select is(registrar_perda_ou_ajuste((select id from ids where nome = 'var_forminha'), null, 'perda_avaria', -1500, 'molhou'),
  'solicitacao', 'outra acima do limite');
insert into sol select 'B', max(id) from solicitacoes_ajuste;
select is(registrar_perda_ou_ajuste((select id from ids where nome = 'var_caixa'), null, 'perda_avaria', -1, 'amassou'),
  'solicitacao', 'sem custo médio: sempre vira solicitação');
select is((select count(*) from solicitacoes_ajuste), 3::bigint, 'funcionária vê só as solicitações dela');
select throws_ok($$select decidir_solicitacao((select id from sol where nome = 'A'), true)$$,
  'P0001', 'Você não tem permissão para acessar esta página.', 'funcionária não decide');

-- Administradora decide
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select is((select count(*) from solicitacoes_ajuste where situacao = 'pendente'), 4::bigint, 'administradora vê todas');
select lives_ok($$select decidir_solicitacao((select id from sol where nome = 'A'), true)$$, 'aprova a solicitação A');
select results_eq(
  $$select usuario_id, aprovado_por, origem, origem_id, quantidade from movimentacoes order by id desc limit 1$$,
  $$select '00000000-0000-0000-0000-00000000000b'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid,
      'solicitacao'::text, id::text, -1001::bigint from sol where nome = 'A'$$,
  'movimentação em nome da funcionária, aprovada pela administradora');
select is((select total from saldo_de where nome = 'var_forminha'), 994::bigint, '1995 - 1001 = 994');
select is((select situacao::text from solicitacoes_ajuste where id = (select id from sol where nome = 'A')), 'aprovada', 'A aprovada');
select throws_ok($$select decidir_solicitacao((select id from sol where nome = 'A'), true)$$,
  'P0001', 'Esta solicitação já foi decidida.', 'aprovar de novo');
select throws_ok($$select decidir_solicitacao((select id from sol where nome = 'B'), true)$$,
  'P0001', 'Saldo insuficiente: há 994 un neste lote.', 'B não cabe mais no saldo');
select is((select situacao::text from solicitacoes_ajuste where id = (select id from sol where nome = 'B')), 'pendente',
  'B continua pendente');
select lives_ok($$select decidir_solicitacao((select id from sol where nome = 'B'), false)$$, 'recusa B');
select results_eq(
  $$select situacao::text, decidido_por from solicitacoes_ajuste where id = (select id from sol where nome = 'B')$$,
  $$values ('recusada'::text, '00000000-0000-0000-0000-00000000000a'::uuid)$$,
  'B recusada pela administradora');
select is((select total from saldo_de where nome = 'var_forminha'), 994::bigint, 'recusar não muda o saldo');

select * from finish();
rollback;
