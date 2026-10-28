-- Notas de entrada, parte 4: divergências com o fornecedor, busca pelo fornecedor e aviso no Início.
begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
update configuracoes set cnpj_loja = '11222333000181' where id = 1;
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
insert into ids select 'caixa', criar_produto('{"nome":"Caixa","tipo_venda":"unidade"}');
insert into ids select 'tampa', criar_produto('{"nome":"Tampa","tipo_venda":"unidade"}');
insert into ids select 'var_' || i.nome, v.id from ids i join variacoes v on v.produto_id = i.id;

create function pg_temp.item(p_numero int, p_codigo text, p_unidade text, p_quantidade text)
returns jsonb language sql as $$
  select jsonb_build_object(
    'numero_item', p_numero, 'codigo', p_codigo, 'descricao', 'ITEM ' || p_codigo, 'codigo_barras', null,
    'ncm', '48239099', 'unidade', p_unidade, 'quantidade', p_quantidade, 'rastro', '[]'::jsonb,
    'valores', jsonb_build_object('valor_produto', '10.00'))
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

-- Nota confirmada: 240 recebidos de 250 (diferença) e 3 de 3 (sem diferença)
insert into ids select 'n1', importar_nota(pg_temp.nota(repeat('1', 44), jsonb_build_array(
  pg_temp.item(1, 'A1', 'CX', '2.5000'), pg_temp.item(2, 'B2', 'UN', '3.0000'))));
select ligar_item_nota(pg_temp.item_id('n1', 1), (select id from ids where nome = 'var_forminha'), 100);
select ligar_item_nota(pg_temp.item_id('n1', 2), (select id from ids where nome = 'var_caixa'), 1);
select salvar_recebimento_item(pg_temp.item_id('n1', 1), 240, '[]');
select confirmar_nota((select id from ids where nome = 'n1'));
-- Nota em revisão com diferença (não conta) e nota esperando o administrador
insert into ids select 'n2', importar_nota(pg_temp.nota(repeat('2', 44), jsonb_build_array(pg_temp.item(1, 'A1', 'CX', '1.0000'))));
select salvar_recebimento_item(pg_temp.item_id('n2', 1), 90, '[]');
insert into ids select 'n3', importar_nota(pg_temp.nota(repeat('3', 44), jsonb_build_array(pg_temp.item(1, 'Z9', 'UN', '1.0000'))));

select results_eq(
  $$select fornecedor, numero, numero_item, quantidade_base_nota, quantidade_base_recebida, diferenca, produto
    from divergencias_fornecedor$$,
  $$values ('Embalagens Exemplo Ltda'::text, '111'::text, 1, 250::bigint, 240::bigint, -10::bigint, 'Forminha'::text)$$,
  'só o item da nota confirmada que chegou diferente');
select is((select count(*) from buscar_produtos('EMBALAGENS exemplo')), 2::bigint,
  'a busca de produtos acha pelo nome do fornecedor, sem diferenciar maiúsculas');
select is((select nome from buscar_produtos('Embalagens Exemplo') order by nome limit 1), 'Caixa',
  'os produtos ligados a esse fornecedor');
select is((select count(*) from buscar_produtos('tampa')), 1::bigint, 'a busca pelo nome do produto continua igual');
select is((select notas_aguardando from avisos_inicio()), 1, 'uma nota esperando o administrador');
select is((select vencendo from avisos_inicio()), 0, 'as outras contagens continuam no Início');

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select is((select count(*) from divergencias_fornecedor), 1::bigint, 'a funcionária vê as divergências (sem valores)');

select * from finish();
rollback;
