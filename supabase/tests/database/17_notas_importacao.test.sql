-- Notas de entrada, parte 2: importação, conferências da nota e ligação automática dos itens (R6).
begin;
select plan(19);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true}');
insert into ids select 'var_' || i.nome, v.id from ids i join variacoes v on v.produto_id = i.id;

-- Monta o "dados" de importar_nota, como o app manda depois de ler o XML.
create function pg_temp.item(p_numero int, p_codigo text, p_unidade text, p_quantidade text, p_rastro jsonb default '[]')
returns jsonb language sql as $$
  select jsonb_build_object(
    'numero_item', p_numero, 'codigo', p_codigo, 'descricao', 'ITEM ' || p_codigo, 'codigo_barras', null,
    'ncm', '48239099', 'unidade', p_unidade, 'quantidade', p_quantidade, 'rastro', p_rastro,
    'valores', jsonb_build_object('valor_produto', '100.00', 'desconto', '5.00', 'frete', '2.50', 'seguro', '0',
      'outras_despesas', '0.50', 'ipi', '1.00', 'icms_st', '3.00'))
$$;
create function pg_temp.nota(p_chave text, p_itens jsonb, p_destinatario text default '11222333000181',
  p_fornecedor text default 'Embalagens Exemplo Ltda')
returns jsonb language sql as $$
  select jsonb_build_object(
    'chave', p_chave, 'emitente', jsonb_build_object('cnpj', '11444777000161', 'nome', p_fornecedor),
    'destinatario_cnpj', p_destinatario, 'numero', right(p_chave, 3), 'serie', '1',
    'emitida_em', '2026-10-20T10:00:00-03:00', 'caminho_xml', p_chave || '.xml', 'itens', p_itens)
$$;

-- Conferências da nota
select throws_ok(
  $$select importar_nota(pg_temp.nota(repeat('1', 44), jsonb_build_array(pg_temp.item(1, 'A1', 'CX', '2.5000'))))$$,
  'P0001', 'Informe o CNPJ da loja em Configurações antes de importar notas.', 'sem o CNPJ da loja');
select tests.sair();
update configuracoes set cnpj_loja = '11222333000181' where id = 1;
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select throws_ok(
  $$select importar_nota(pg_temp.nota(repeat('1', 44), jsonb_build_array(pg_temp.item(1, 'A1', 'CX', '2.5000')), '04252011000110'))$$,
  'P0001', 'Esta nota não é para a loja: o destinatário é outro CNPJ.', 'destinatário é outro CNPJ');

-- Nota nova, de fornecedor novo: nada ligado ainda
insert into ids select 'n1', importar_nota(pg_temp.nota(repeat('1', 44), jsonb_build_array(
  pg_temp.item(1, 'A1', 'CX', '2.5000'),
  pg_temp.item(2, 'B2', 'KG', '2.0000', '[{"codigo":"L1","quantidade":"1.5000","validade":"2027-03-10"},{"codigo":"L2","quantidade":"0.5000","validade":"2027-05-22"}]'))));
select is((select nome from fornecedores where cnpj = '11444777000161'), 'Embalagens Exemplo Ltda', 'cria o fornecedor');
select is((select situacao::text from notas_entrada where id = (select id from ids where nome = 'n1')),
  'aguardando_administrador', 'com item sem ligação, a nota espera o administrador');
select results_eq(
  $$select numero_item, quantidade_nota, variacao_id is null, jsonb_array_length(rastro), caminho_xml
    from notas_entrada_itens i join notas_entrada n on n.id = i.nota_id
    where nota_id = (select id from ids where nome = 'n1') order by numero_item$$,
  $$values (1, 2.5000::numeric, true, 0, repeat('1', 44) || '.xml'), (2, 2.0000::numeric, true, 2, repeat('1', 44) || '.xml')$$,
  'itens como vieram do XML, sem ligação');
select is(
  (select v.custo_total from notas_entrada_itens_valores v join notas_entrada_itens i on i.id = v.item_id
   where i.nota_id = (select id from ids where nome = 'n1') and i.numero_item = 1),
  102.00::numeric, 'custo do item: 100 − 5 + 2,50 + 0 + 0,50 + 1 + 3 = 102');
select throws_ok(
  $$select importar_nota(pg_temp.nota(repeat('1', 44), jsonb_build_array(pg_temp.item(1, 'A1', 'CX', '2.5000'))))$$,
  'P0001', 'Esta nota já foi importada em ' || to_char(hoje_sp(), 'DD/MM/YYYY') || ' por dona.', 'a mesma chave de novo');

-- Ligações lembradas: a próxima nota do mesmo fornecedor já vem ligada
select tests.sair();
insert into fornecedor_itens (fornecedor_id, codigo_fornecedor, unidade_fornecedor, descricao_fornecedor, variacao_id, fator)
select f.id, x.codigo, x.unidade, 'ITEM ' || x.codigo, (select id from ids where nome = x.variacao), x.fator
from fornecedores f, (values ('A1', 'CX', 'var_forminha', 100), ('B2', 'KG', 'var_granulado', 1000), ('C3', 'CX', 'var_forminha', 3))
  as x (codigo, unidade, variacao, fator)
where f.cnpj = '11444777000161';
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

insert into ids select 'n2', importar_nota(pg_temp.nota(repeat('2', 44), jsonb_build_array(
  pg_temp.item(1, 'A1', 'CX', '2.5000'),
  pg_temp.item(2, 'B2', 'KG', '2.0000', '[{"codigo":"L1","quantidade":"1.5000","validade":"2027-03-10"},{"codigo":"L2","quantidade":"0.5000","validade":"2027-05-22"}]'),
  pg_temp.item(3, 'A1', 'CX', '1.0000', '[{"codigo":"L9","quantidade":"1.0000","validade":"2027-01-01"}]'))));
select is((select situacao::text from notas_entrada where id = (select id from ids where nome = 'n2')), 'em_revisao',
  'tudo ligado: pronta para revisar');
select results_eq(
  $$select fator, quantidade_base_nota, quantidade_base_recebida from notas_entrada_itens
    where nota_id = (select id from ids where nome = 'n2') and numero_item = 1$$,
  $$values (100::bigint, 250::bigint, 250::bigint)$$,
  '2,5 CX × 100 = 250 un; a recebida começa igual à da nota');
select is(
  (select v.custo_unitario_base from notas_entrada_itens_valores v join notas_entrada_itens i on i.id = v.item_id
   where i.nota_id = (select id from ids where nome = 'n2') and i.numero_item = 1),
  0.408::numeric, 'custo por unidade base: 102 ÷ 250');
select results_eq(
  $$select l.codigo_lote, l.validade, l.quantidade_base from notas_entrada_item_lotes l join notas_entrada_itens i on i.id = l.item_id
    where i.nota_id = (select id from ids where nome = 'n2') and i.numero_item = 2 order by l.codigo_lote$$,
  $$values ('L1'::text, '2027-03-10'::date, 1500::bigint), ('L2'::text, '2027-05-22'::date, 500::bigint)$$,
  'produto com validade: lotes do rastro convertidos para gramas');
select is(
  (select count(*) from notas_entrada_item_lotes l join notas_entrada_itens i on i.id = l.item_id
   where i.nota_id = (select id from ids where nome = 'n2') and i.numero_item = 3),
  0::bigint, 'produto sem validade ignora o rastro');

-- R6: ligação lembrada que não dá quantidade inteira deixa o item sem ligação
insert into ids select 'n3', importar_nota(pg_temp.nota(repeat('3', 44), jsonb_build_array(pg_temp.item(1, 'C3', 'CX', '2.5000'))));
select results_eq(
  $$select i.variacao_id is null, n.situacao::text from notas_entrada_itens i join notas_entrada n on n.id = i.nota_id
    where n.id = (select id from ids where nome = 'n3')$$,
  $$values (true, 'aguardando_administrador'::text)$$,
  '2,5 CX × 3 não dá inteiro: item sem ligação, nota espera o administrador');

-- O mesmo CNPJ com outro nome atualiza o fornecedor
insert into ids select 'n4', importar_nota(pg_temp.nota(repeat('4', 44), jsonb_build_array(pg_temp.item(1, 'A1', 'CX', '1.0000')),
  '11222333000181', 'Embalagens Exemplo Ltda ME'));
select is((select nome from fornecedores where cnpj = '11444777000161'), 'Embalagens Exemplo Ltda ME', 'nome do fornecedor atualizado');
select is((select count(*) from fornecedores), 1::bigint, 'continua um fornecedor só');

-- A funcionária também importa
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select lives_ok(
  $$insert into ids select 'n5', importar_nota(pg_temp.nota(repeat('5', 44), jsonb_build_array(pg_temp.item(1, 'A1', 'CX', '1.0000'))))$$,
  'funcionária importa nota');
select is((select importada_por from notas_entrada where id = (select id from ids where nome = 'n5')),
  '00000000-0000-0000-0000-00000000000b'::uuid, 'a nota guarda quem importou');
select throws_ok(
  $$select aplicar_ligacao_item((select id from notas_entrada_itens limit 1), (select id from ids where nome = 'var_forminha'), 100)$$,
  '42501', null, 'função interna fechada para quem entra no site');
select tests.sair();
select is((select count(*) from notas_entrada), 5::bigint, 'cinco notas importadas');

select * from finish();
rollback;
