-- Notas de entrada, parte 3: ligar itens, recebimento e lotes, confirmação (entrada no estoque) e descarte.
begin;
select plan(25);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
update configuracoes set cnpj_loja = '11222333000181' where id = 1;
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true}');
insert into ids select 'var_' || i.nome, v.id from ids i join variacoes v on v.produto_id = i.id;

create function pg_temp.item(p_numero int, p_codigo text, p_unidade text, p_quantidade text, p_rastro jsonb default '[]')
returns jsonb language sql as $$
  select jsonb_build_object(
    'numero_item', p_numero, 'codigo', p_codigo, 'descricao', 'ITEM ' || p_codigo, 'codigo_barras', null,
    'ncm', '48239099', 'unidade', p_unidade, 'quantidade', p_quantidade, 'rastro', p_rastro,
    'valores', jsonb_build_object('valor_produto', '100.00', 'desconto', '5.00', 'frete', '2.50', 'seguro', '0',
      'outras_despesas', '0.50', 'ipi', '1.00', 'icms_st', '3.00'))
$$;
create function pg_temp.nota(p_chave text, p_itens jsonb)
returns jsonb language sql as $$
  select jsonb_build_object(
    'chave', p_chave, 'emitente', jsonb_build_object('cnpj', '11444777000161', 'nome', 'Embalagens Exemplo Ltda'),
    'destinatario_cnpj', '11222333000181', 'numero', right(p_chave, 3), 'serie', '1',
    'emitida_em', '2026-10-20T10:00:00-03:00', 'caminho_xml', p_chave || '.xml', 'itens', p_itens)
$$;
create function pg_temp.item_id(p_nota text, p_numero int) returns uuid language sql as $$
  select i.id from notas_entrada_itens i where i.nota_id = (select id from ids where nome = p_nota) and i.numero_item = p_numero
$$;

-- A funcionária importa uma nota de fornecedor novo: nada ligado
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
insert into ids select 'n1', importar_nota(pg_temp.nota(repeat('1', 44), jsonb_build_array(
  pg_temp.item(1, 'A1', 'CX', '2.5000'),
  pg_temp.item(2, 'B2', 'KG', '2.0000', '[{"codigo":"L1","quantidade":"1.5000","validade":"2027-03-10"},{"codigo":"L2","quantidade":"0.5000","validade":"2027-05-22"}]'),
  pg_temp.item(3, 'A1', 'CX', '1.0000'),
  pg_temp.item(4, 'D4', 'UN', '5.0000'))));

-- Ligar é só do administrador
select throws_ok($$select ligar_item_nota(pg_temp.item_id('n1', 1), (select id from ids where nome = 'var_forminha'), 100)$$,
  'P0001', 'Você não tem permissão para acessar esta página.', 'funcionária não liga itens');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select lives_ok($$select ligar_item_nota(pg_temp.item_id('n1', 1), (select id from ids where nome = 'var_forminha'), 100)$$,
  'administradora liga o item 1');
select results_eq(
  $$select numero_item, quantidade_base_nota from notas_entrada_itens
    where nota_id = (select id from ids where nome = 'n1') and variacao_id is not null order by numero_item$$,
  $$values (1, 250::bigint), (3, 100::bigint)$$,
  'o item 3 (mesmo código e unidade) também fica ligado');
select ok(exists (select 1 from fornecedor_itens where codigo_fornecedor = 'A1' and unidade_fornecedor = 'CX' and fator = 100),
  'a ligação fica lembrada');
select is((select situacao::text from notas_entrada where id = (select id from ids where nome = 'n1')), 'aguardando_administrador',
  'ainda há itens sem ligação');
select throws_ok($$select ligar_item_nota(pg_temp.item_id('n1', 2), (select id from ids where nome = 'var_granulado'), 3)$$,
  'P0001', 'Item 2 (ITEM B2): 1,5 KG × 3 não dá quantidade inteira. Confira o fator.', 'lote do rastro que não dá inteiro (R6)');
select lives_ok($$select ligar_item_nota(pg_temp.item_id('n1', 2), (select id from ids where nome = 'var_granulado'), 1000)$$,
  'liga o granulado em gramas');
select lives_ok($$select ligar_item_nota(pg_temp.item_id('n1', 4), (select id from ids where nome = 'var_forminha'), 1)$$,
  'liga o item 4');
select is((select situacao::text from notas_entrada where id = (select id from ids where nome = 'n1')), 'em_revisao',
  'tudo ligado: em revisão');

-- Recebimento e lotes
select throws_ok(
  $$select salvar_recebimento_item(pg_temp.item_id('n1', 2), 1800, '[{"codigo":"L1","validade":"2027-03-10","quantidade":1500}]')$$,
  'P0001', 'Item 2 (ITEM B2): a soma dos lotes (1500) precisa ser igual à quantidade recebida (1800).', 'lotes que não somam a recebida');
select throws_ok(
  $$select salvar_recebimento_item(pg_temp.item_id('n1', 2), 2000, '[{"codigo":"L1","validade":null,"quantidade":2000}]')$$,
  'P0001', 'Item 2 (ITEM B2): informe a validade de cada lote.', 'lote sem validade em produto que controla');
select lives_ok($$select salvar_recebimento_item(pg_temp.item_id('n1', 1), 240, '[]')$$, 'recebeu 240 das 250 un');
select lives_ok($$select salvar_recebimento_item(pg_temp.item_id('n1', 4), 0, '[]')$$, 'o item 4 não chegou');

-- Confirmação: tudo entra de uma vez
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select lives_ok($$select confirmar_nota((select id from ids where nome = 'n1'))$$, 'funcionária confirma a nota');
select tests.sair();
select is((select count(*) from movimentacoes where origem = 'nota' and origem_id = (select id from ids where nome = 'n1')::text),
  4::bigint, 'uma entrada por item (e por lote); o item que não chegou não entra');
select is((select sum(quantidade) from saldos where variacao_id = (select id from ids where nome = 'var_forminha')),
  340::numeric, 'Forminha: 240 + 100');
select results_eq(
  $$select l.codigo, l.validade, s.quantidade from lotes l join saldos s on s.lote_id = l.id
    where l.variacao_id = (select id from ids where nome = 'var_granulado') order by l.codigo$$,
  $$values ('L1'::text, '2027-03-10'::date, 1500::bigint), ('L2'::text, '2027-05-22'::date, 500::bigint)$$,
  'Granulado: os lotes do rastro, com as validades');
select results_eq(
  $$select distinct tipo::text, motivo, usuario_id from movimentacoes where origem = 'nota'$$,
  $$values ('entrada_nota'::text, 'Nota nº 111 de Embalagens Exemplo Ltda'::text, '00000000-0000-0000-0000-00000000000b'::uuid)$$,
  'entrada por nota, com o motivo e em nome de quem confirmou');
select is(
  (select mc.custo_unitario from movimentacoes_custos mc join movimentacoes m on m.id = mc.movimentacao_id
   where m.origem = 'nota' and m.quantidade = 240),
  0.408::numeric, 'o custo da entrada é o custo por unidade base do item');
select results_eq(
  $$select situacao::text, confirmada_por from notas_entrada where id = (select id from ids where nome = 'n1')$$,
  $$values ('confirmada'::text, '00000000-0000-0000-0000-00000000000b'::uuid)$$,
  'nota confirmada, com quem confirmou');

-- Depois de confirmada, nada muda
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select throws_ok($$select confirmar_nota((select id from ids where nome = 'n1'))$$,
  'P0001', 'Esta nota já foi confirmada ou descartada.', 'confirmar duas vezes');

-- Nota sem ligação não confirma; item sem ligação não recebe; descartada libera a chave
insert into ids select 'n2', importar_nota(pg_temp.nota(repeat('2', 44), jsonb_build_array(pg_temp.item(1, 'Z9', 'UN', '1.0000'))));
select throws_ok($$select confirmar_nota((select id from ids where nome = 'n2'))$$,
  'P0001', 'Ainda há itens sem ligação: o administrador precisa ligá-los.', 'nota com item sem ligação');
select throws_ok($$select salvar_recebimento_item(pg_temp.item_id('n2', 1), 1, '[]')$$,
  'P0001', 'Este item ainda não está ligado: o administrador precisa ligá-lo.', 'recebimento de item sem ligação');
select lives_ok($$select descartar_nota((select id from ids where nome = 'n2'))$$, 'descarta a nota');
select lives_ok(
  $$select importar_nota(pg_temp.nota(repeat('2', 44), jsonb_build_array(pg_temp.item(1, 'Z9', 'UN', '1.0000'))))$$,
  'a mesma chave entra de novo depois de descartada');

select * from finish();
rollback;
