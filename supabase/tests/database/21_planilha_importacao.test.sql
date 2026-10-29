-- Planilha, parte 2: importar_planilha grava produtos, variações, categorias, materiais e formas, tudo ou nada.
begin;
select plan(26);

-- As regras de faixa são conferidas no fim da transação; no teste, a cada comando.
set constraints all immediate;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
insert into categorias (nome) values ('bolos');

-- Um produto da planilha, com os campos que não importam no teste já preenchidos.
create function pg_temp.produto(p_id uuid, p_nome text, p_tipo text, p_categorias jsonb, p_variacoes jsonb)
returns jsonb language sql as $$
  select jsonb_build_object(
    'id', p_id, 'nome', p_nome, 'ncm', '48191000', 'tipo_venda', p_tipo, 'controla_validade', false,
    'apto_forno', false, 'apto_freezer', true, 'apto_microondas', false, 'apto_alimento', true,
    'categorias', p_categorias, 'materiais', '["Papel"]'::jsonb, 'variacoes', p_variacoes)
$$;
create function pg_temp.variacao(p_codigo text, p_nome text, p_barras text)
returns jsonb language sql as $$
  select jsonb_build_object(
    'codigo_interno', p_codigo, 'nome', p_nome, 'codigo_barras', p_barras, 'estoque_minimo', 20,
    'comprimento_mm', 150, 'largura_mm', null, 'altura_mm', null, 'capacidade_ml', null)
$$;
create function pg_temp.forma(p_nome text, p_fator int, p_preco int, p_faixas jsonb default '[]')
returns jsonb language sql as $$
  select jsonb_build_object('nome', p_nome, 'fator', p_fator, 'preco_centavos', p_preco, 'faixas', p_faixas)
$$;
create function pg_temp.dados(p_produtos jsonb, p_formas jsonb default '[]') returns jsonb language sql as $$
  select jsonb_build_object('produtos', p_produtos, 'formas', p_formas)
$$;
create function pg_temp.id_produto(p_codigo text) returns uuid language sql as $$
  select produto_id from variacoes where codigo_interno = p_codigo
$$;
create function pg_temp.forma_ativa(p_codigo text, p_nome text) returns boolean language sql as $$
  select f.ativa from formas_venda f join variacoes v on v.id = f.variacao_id where v.codigo_interno = p_codigo and f.nome = p_nome
$$;

-- Só o administrador
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select throws_ok($$select importar_planilha('{"produtos":[],"formas":[]}')$$, 'P0001',
  'Você não tem permissão para acessar esta página.', 'a funcionária não importa');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

-- Produto novo com duas variações, categorias por caminho, material novo e forma com faixa
select lives_ok($$select importar_planilha(pg_temp.dados(
  jsonb_build_array(pg_temp.produto(null, 'Caixa para bolo', 'unidade', '["Bolos > Caixas", "Festa"]',
    jsonb_build_array(pg_temp.variacao(' cx-p ', 'P', '7891000000014'), pg_temp.variacao('CX-G', '', null)))),
  jsonb_build_array(jsonb_build_object('codigo_interno', 'CX-P', 'formas',
    jsonb_build_array(pg_temp.forma('Pacote com 10', 10, 1500, '[{"quantidade_minima":5,"preco_centavos":1400}]'))))))$$,
  'produto novo');
select is((select count(*) from variacoes where produto_id = pg_temp.id_produto('CX-P')), 2::bigint,
  'as duas variações no mesmo produto, com o código normalizado');
select is((select nome from variacoes where codigo_interno = 'CX-G'), 'Padrão', 'variação sem nome vira Padrão');
select is((select count(*) from categorias where lower(nome) = 'bolos'), 1::bigint, 'usa a categoria que já existe, sem diferença de maiúsculas');
select is(
  (select array_agg(c.nome order by c.nome) from produto_categorias pc join categorias c on c.id = pc.categoria_id
   where pc.produto_id = pg_temp.id_produto('CX-P')),
  array['Caixas', 'Festa'], 'cria o que falta do caminho e liga as categorias');
select is((select categoria_pai_id from categorias where nome = 'Caixas'), (select id from categorias where nome = 'bolos'),
  'Caixas fica dentro de Bolos');
select is(
  (select e.nome from produto_etiquetas pe join etiquetas e on e.id = pe.etiqueta_id where pe.produto_id = pg_temp.id_produto('CX-P')),
  'Papel', 'cria e liga o material');
select is(
  (select fx.preco_centavos from faixas_preco fx join formas_venda f on f.id = fx.forma_venda_id
   join variacoes v on v.id = f.variacao_id where v.codigo_interno = 'CX-P' and fx.quantidade_minima = 5),
  1400, 'a forma com a faixa');

-- O produto que não mudou não é regravado
create temp table antes as select ctid::text as ctid from produtos where id = pg_temp.id_produto('CX-P');
select importar_planilha(pg_temp.dados(jsonb_build_array(pg_temp.produto(pg_temp.id_produto('CX-P'), 'Caixa para bolo', 'unidade',
  '["Bolos > Caixas", "Festa"]', jsonb_build_array(pg_temp.variacao('CX-P', 'P', '7891000000014'))))));
select is((select ctid::text from produtos where id = pg_temp.id_produto('CX-P')), (select ctid from antes), 'produto igual não é regravado');

-- Atualização: renomeia, apaga o código de barras, troca as categorias e as formas
insert into formas_venda (variacao_id, nome, fator, preco_centavos) values ((select id from variacoes where codigo_interno = 'CX-G'), 'Unidade', 1, 300);
select lives_ok($$select importar_planilha(pg_temp.dados(
  jsonb_build_array(pg_temp.produto(pg_temp.id_produto('CX-P'), 'Caixa de bolo', 'unidade', '["Festa"]',
    jsonb_build_array(pg_temp.variacao('CX-P', 'P', null)))),
  jsonb_build_array(jsonb_build_object('codigo_interno', 'CX-P', 'formas', jsonb_build_array(pg_temp.forma('Unidade', 1, 200))))))$$,
  'atualização');
select is((select nome from produtos where id = pg_temp.id_produto('CX-P')), 'Caixa de bolo', 'renomeia o produto');
select is((select codigo_barras from variacoes where codigo_interno = 'CX-P'), null, 'célula vazia apaga o código de barras');
select is((select count(*) from produto_categorias where produto_id = pg_temp.id_produto('CX-P')), 1::bigint, 'fica só com as categorias da planilha');
select is(pg_temp.forma_ativa('CX-P', 'Pacote com 10'), false, 'a forma que sumiu é desativada');
select is(pg_temp.forma_ativa('CX-P', 'Unidade'), true, 'a forma nova');
select is(pg_temp.forma_ativa('CX-G', 'Unidade'), true, 'a variação fora das formas não muda');

-- A forma desativada volta pelo mesmo nome, sem a faixa que não veio
select importar_planilha(pg_temp.dados('[]', jsonb_build_array(jsonb_build_object('codigo_interno', 'CX-P',
  'formas', jsonb_build_array(pg_temp.forma('pacote com 10', 10, 1500))))));
select is(pg_temp.forma_ativa('CX-P', 'Pacote com 10'), true, 'a forma desativada volta a ficar ativa');
select is((select count(*) from formas_venda f join variacoes v on v.id = f.variacao_id where v.codigo_interno = 'CX-P'), 2::bigint,
  'sem forma repetida');
select is(
  (select count(*) from faixas_preco fx join formas_venda f on f.id = fx.forma_venda_id join variacoes v on v.id = f.variacao_id
   where v.codigo_interno = 'CX-P'), 0::bigint, 'a faixa que não veio é apagada');

-- Produto por peso: a forma é a granel
select importar_planilha(pg_temp.dados(
  jsonb_build_array(pg_temp.produto(null, 'Granulado', 'peso', '[]', jsonb_build_array(pg_temp.variacao('GR-1', 'Chocolate', null)))),
  jsonb_build_array(jsonb_build_object('codigo_interno', 'GR-1', 'formas', jsonb_build_array(pg_temp.forma('Granel', 1000, 3200))))));
select is((select f.peso_variavel from formas_venda f join variacoes v on v.id = f.variacao_id where v.codigo_interno = 'GR-1'), true,
  'forma de produto por peso é a granel');

-- Troca de código de barras entre duas variações
update variacoes set codigo_barras = '7891000000014' where codigo_interno = 'CX-P';
update variacoes set codigo_barras = '7891000000021' where codigo_interno = 'CX-G';
select lives_ok($$select importar_planilha(pg_temp.dados(jsonb_build_array(pg_temp.produto(pg_temp.id_produto('CX-P'), 'Caixa de bolo',
  'unidade', '["Festa"]', jsonb_build_array(pg_temp.variacao('CX-P', 'P', '7891000000021'), pg_temp.variacao('CX-G', 'G', '7891000000014'))))))$$,
  'troca de códigos de barras');
select is((select codigo_barras from variacoes where codigo_interno = 'CX-G'), '7891000000014', 'os códigos trocados');

-- Tudo ou nada
select throws_ok($$select importar_planilha(pg_temp.dados(
  jsonb_build_array(pg_temp.produto(null, 'Forminha', 'unidade', '[]', jsonb_build_array(pg_temp.variacao('FM-1', 'N4', null)))),
  jsonb_build_array(jsonb_build_object('codigo_interno', 'CX-P', 'formas',
    jsonb_build_array(pg_temp.forma('Unidade', 1, 200, '[{"quantidade_minima":2,"preco_centavos":250}]'))))))$$,
  'P0001', 'O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.', 'faixa fora de ordem');
select is((select count(*) from produtos where nome = 'Forminha'), 0::bigint, 'nada da chamada fica gravado');
select throws_ok($$select importar_planilha(pg_temp.dados(jsonb_build_array(pg_temp.produto(pg_temp.id_produto('GR-1'), 'Granulado',
  'peso', '[]', jsonb_build_array(pg_temp.variacao('CX-P', 'P', null))))))$$,
  'P0001', 'Variação CX-P não é do produto Granulado.', 'variação de outro produto');

select * from finish();
rollback;
