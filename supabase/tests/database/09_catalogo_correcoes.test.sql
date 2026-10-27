-- Correções da revisão do catálogo: salvar a ficha de uma vez, forma de venda x tipo do produto,
-- grade sem combinações repetidas, limite de fotos ao mover e códigos internos sem curingas.
begin;
select plan(26);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'caixa', criar_produto('{"nome":"Caixa","tipo_venda":"unidade"}');
with c as (insert into categorias (nome) values ('Doces') returning id) insert into ids select 'doces', id from c;
with c as (insert into categorias (nome) values ('Festas') returning id) insert into ids select 'festas', id from c;
with e as (insert into etiquetas (nome) values ('Papel') returning id) insert into ids select 'papel', id from e;

-- Ficha salva de uma vez: dados, categorias e materiais
select lives_ok(
  $$select atualizar_produto((select id from ids where nome = 'caixa'), jsonb_build_object(
    'nome', 'Caixa', 'tipo_venda', 'unidade',
    'categorias', jsonb_build_array((select id from ids where nome = 'doces'))))$$,
  'salva com uma categoria');
select lives_ok(
  $$select atualizar_produto((select id from ids where nome = 'caixa'), jsonb_build_object(
    'nome', ' Caixa kraft ', 'tipo_venda', 'unidade', 'ncm', '48191000', 'apto_freezer', true,
    'categorias', jsonb_build_array((select id from ids where nome = 'festas')),
    'etiquetas', jsonb_build_array((select id from ids where nome = 'papel'))))$$,
  'troca a categoria e põe um material');
select results_eq(
  $$select nome, ncm, apto_freezer from produtos where id = (select id from ids where nome = 'caixa')$$,
  $$values ('Caixa kraft'::text, '48191000'::text, true)$$,
  'dados gravados');
select results_eq(
  $$select categoria_id from produto_categorias where produto_id = (select id from ids where nome = 'caixa')$$,
  $$select id from ids where nome = 'festas'$$,
  'só a categoria nova fica');
select results_eq(
  $$select etiqueta_id from produto_etiquetas where produto_id = (select id from ids where nome = 'caixa')$$,
  $$select id from ids where nome = 'papel'$$,
  'material gravado');
select throws_ok(
  $$select atualizar_produto((select id from ids where nome = 'caixa'), jsonb_build_object(
    'nome', 'Caixa nova', 'tipo_venda', 'unidade',
    'categorias', jsonb_build_array((select id from ids where nome = 'doces')),
    'etiquetas', jsonb_build_array(gen_random_uuid())))$$,
  '23503', null, 'material que não existe');
select results_eq(
  $$select p.nome, pc.categoria_id from produtos p join produto_categorias pc on pc.produto_id = p.id
    where p.id = (select id from ids where nome = 'caixa')$$,
  $$select 'Caixa kraft'::text, id from ids where nome = 'festas'$$,
  'com o erro, nem o nome nem as categorias mudam');
select throws_ok(
  $$select atualizar_produto(gen_random_uuid(), '{"nome":"X","tipo_venda":"unidade"}')$$,
  'P0001', 'Produto não encontrado.', 'produto que não existe');

-- Forma de venda precisa combinar com o tipo de venda do produto
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso"}');
select throws_ok(
  $$insert into formas_venda (variacao_id, nome, fator, preco_centavos)
    values ((select id from variacoes where produto_id = (select id from ids where nome = 'granulado')), 'Pacote 500 g', 500, 1600)$$,
  'P0001', 'Produto vendido por peso só tem forma a granel.', 'forma por unidade em produto por peso');
select lives_ok(
  $$insert into formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel)
    values ((select id from variacoes where produto_id = (select id from ids where nome = 'granulado')), 'Granel', 1000, 3200, true)$$,
  'granel em produto por peso continua valendo');
select throws_ok(
  $$update formas_venda set peso_variavel = false
    where variacao_id = (select id from variacoes where produto_id = (select id from ids where nome = 'granulado'))$$,
  'P0001', 'Produto vendido por peso só tem forma a granel.', 'granel não vira forma por unidade');

-- Grade: cada combinação de atributos uma vez só por produto
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade"}');
select is(
  gerar_grade((select id from ids where nome = 'forminha'),
    '[{"nome":"4 marrom","atributos":{"Tamanho":"4","Cor":"marrom"}},{"nome":"6 marrom","atributos":{"Tamanho":"6","Cor":"marrom"}}]'),
  2, 'cria as combinações');
select is(
  gerar_grade((select id from ids where nome = 'forminha'),
    '[{"nome":"4 marrom","atributos":{"Cor":"marrom","Tamanho":"4"}},{"nome":"12 marrom","atributos":{"Tamanho":"12","Cor":"marrom"}}]'),
  1, 'pula as que já existem, mesmo com os atributos em outra ordem');
select is(
  (select count(*)::int from variacoes where produto_id = (select id from ids where nome = 'forminha')),
  4, 'Padrão e mais três combinações');
select throws_ok(
  $$insert into variacoes (produto_id, nome, atributos)
    values ((select id from ids where nome = 'forminha'), 'Outra', '{"Tamanho":"4","Cor":"marrom"}')$$,
  '23505', null, 'mesmos atributos no mesmo produto');
select lives_ok(
  $$insert into variacoes (produto_id, nome) values ((select id from ids where nome = 'forminha'), 'Avulsa')$$,
  'variações sem atributos (feitas à mão) podem ser várias');
select lives_ok(
  $$insert into variacoes (produto_id, nome, atributos)
    values ((select id from ids where nome = 'caixa'), '4 marrom', '{"Tamanho":"4","Cor":"marrom"}')$$,
  'mesmos atributos em outro produto');

-- Limite de fotos também ao mover uma foto para outro produto
insert into fotos (produto_id, caminho, ordem)
select (select id from ids where nome = 'forminha'), 'forminha/' || i || '.jpg', i from generate_series(0, 7) i;
insert into fotos (produto_id, caminho) values ((select id from ids where nome = 'caixa'), 'caixa/1.jpg');
select throws_ok(
  $$update fotos set produto_id = (select id from ids where nome = 'forminha') where caminho = 'caixa/1.jpg'$$,
  'P0001', 'Cada produto pode ter até 8 fotos.', 'mover foto para produto que já tem 8');
select lives_ok(
  $$update fotos set ordem = 9 where caminho = 'forminha/0.jpg'$$,
  'reordenar as fotos de um produto com 8');

-- Código interno: guardado em maiúsculas e sem espaços nas pontas; a busca é pelo código exato
insert into variacoes (produto_id, nome, codigo_interno) values ((select id from ids where nome = 'caixa'), 'Tampa', '  tp-01 ');
select is((select codigo_interno from variacoes where nome = 'Tampa'), 'TP-01', 'código digitado é normalizado');
select throws_ok(
  $$insert into variacoes (produto_id, nome, codigo_interno) values ((select id from ids where nome = 'caixa'), 'Outra', 'Tp-01')$$,
  '23505', null, 'código repetido, mesmo com outras maiúsculas');
select is(variacao_por_codigo(' tp-01'), (select id from variacoes where nome = 'Tampa'), 'acha sem diferenciar maiúsculas');
select is(variacao_por_codigo('TP_01'), null, '_ não é curinga');
select is(variacao_por_codigo('TP%'), null, '% não é curinga');

-- Só o administrador
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select throws_ok(
  $$select atualizar_produto((select id from ids where nome = 'caixa'), '{"nome":"X","tipo_venda":"unidade"}')$$,
  'P0001', 'Você não tem permissão para acessar esta página.', 'funcionária não salva a ficha');
select throws_ok(
  $$select gerar_grade((select id from ids where nome = 'caixa'), '[]')$$,
  'P0001', 'Você não tem permissão para acessar esta página.', 'funcionária não gera grade');

select * from finish();
rollback;
