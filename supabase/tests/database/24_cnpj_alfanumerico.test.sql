-- CNPJ alfanumérico: cnpj_valido, CNPJ da loja, fornecedor, chave de acesso e importação da nota.
-- Exemplos alfanuméricos do "Perguntas e respostas: CNPJ alfanumérico" da Receita Federal.
begin;
select plan(20);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');

-- CNPJs só com números continuam valendo
select ok(cnpj_valido('11222333000181'), 'CNPJ numérico certo continua válido');
select ok(cnpj_valido('04252011000110'), 'outro CNPJ numérico certo continua válido');
select ok(not cnpj_valido('11222333000182'), 'CNPJ numérico com dígito errado continua inválido');
select ok(not cnpj_valido('11111111111111'), '14 caracteres iguais são inválidos');

-- CNPJs alfanuméricos
select ok(cnpj_valido('12ABC34501DE35'), 'exemplo da Receita 12.ABC.345/01DE-35 é válido');
select ok(cnpj_valido('AA345678000A29'), 'filial com letra AA.345.678/000A-29 é válida');
select ok(cnpj_valido('12345678000A08'), 'filial com letra 12.345.678/000A-08 é válida');
select ok(not cnpj_valido('12ABC34501DE34'), 'alfanumérico com dígito errado é inválido');
select ok(not cnpj_valido('12ABC34501DE3A'), 'letra no dígito verificador é inválida');
select ok(not cnpj_valido('12abc34501de35'), 'o banco guarda só maiúsculas (o app normaliza antes)');
select ok(not cnpj_valido('12.ABC.345/01DE-35'), 'o banco guarda sem máscara (o app normaliza antes)');

-- CNPJ da loja e fornecedor
select lives_ok($$update configuracoes set cnpj_loja = '12ABC34501DE35' where id = 1$$,
  'CNPJ alfanumérico da loja é salvo');
select throws_ok($$update configuracoes set cnpj_loja = '12ABC34501DE34' where id = 1$$,
  '23514', null, 'CNPJ alfanumérico errado da loja é recusado');
select lives_ok($$insert into fornecedores (cnpj, nome) values ('AA345678000A29', 'Fornecedor Novo Ltda')$$,
  'fornecedor com CNPJ alfanumérico é salvo');

-- Chave de acesso: letras só nas 12 primeiras posições do CNPJ (posições 7 a 18)
select throws_ok(
  $$insert into notas_entrada (chave_acesso, fornecedor_id, numero, serie, emitida_em, caminho_xml, situacao, importada_por)
    values ('35261A' || repeat('1', 38), (select id from fornecedores limit 1), '1', '1', now(), 'a.xml',
            'em_revisao', '00000000-0000-0000-0000-00000000000a')$$,
  '23514', null, 'chave com letra antes do CNPJ (posição 6) é recusada');
select throws_ok(
  $$insert into notas_entrada (chave_acesso, fornecedor_id, numero, serie, emitida_em, caminho_xml, situacao, importada_por)
    values (repeat('1', 18) || 'A' || repeat('1', 25), (select id from fornecedores limit 1), '1', '1', now(), 'c.xml',
            'em_revisao', '00000000-0000-0000-0000-00000000000a')$$,
  '23514', null, 'chave com letra no dígito verificador do CNPJ (posição 19) é recusada');
select throws_ok(
  $$insert into notas_entrada (chave_acesso, fornecedor_id, numero, serie, emitida_em, caminho_xml, situacao, importada_por)
    values ('35261112abc34501de35550010000001231000000123', (select id from fornecedores limit 1), '1', '1', now(), 'b.xml',
            'em_revisao', '00000000-0000-0000-0000-00000000000a')$$,
  '23514', null, 'chave com letra minúscula é recusada');

-- Importação de uma nota de fornecedor com CNPJ alfanumérico, para uma loja com CNPJ alfanumérico
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
create temp table ids (nome text primary key, id uuid);
insert into ids select 'n1', importar_nota(jsonb_build_object(
  'chave', '35261112ABC34501DE35550010000001231000000123',
  'emitente', jsonb_build_object('cnpj', '12345678000A08', 'nome', 'Doces Alfa Ltda'),
  'destinatario_cnpj', '12ABC34501DE35', 'numero', '123', 'serie', '1',
  'emitida_em', '2026-11-20T10:00:00-03:00', 'caminho_xml', 'alfa.xml',
  'itens', jsonb_build_array(jsonb_build_object(
    'numero_item', 1, 'codigo', 'A1', 'descricao', 'ITEM A1', 'codigo_barras', null, 'ncm', '17041000',
    'unidade', 'CX', 'quantidade', '1.0000', 'rastro', '[]'::jsonb,
    'valores', jsonb_build_object('valor_produto', '10.00', 'desconto', '0', 'frete', '0', 'seguro', '0',
      'outras_despesas', '0', 'ipi', '0', 'icms_st', '0')))));
select tests.sair();
select is((select nome from fornecedores where cnpj = '12345678000A08'), 'Doces Alfa Ltda',
  'importação cria o fornecedor com CNPJ alfanumérico');
select is((select chave_acesso from notas_entrada where id = (select id from ids where nome = 'n1')),
  '35261112ABC34501DE35550010000001231000000123', 'a nota guarda a chave com letras');
select is((select f.cnpj from notas_entrada n join fornecedores f on f.id = n.fornecedor_id
           where n.id = (select id from ids where nome = 'n1')),
  '12345678000A08', 'a nota fica ligada ao fornecedor alfanumérico');

select * from finish();
rollback;
