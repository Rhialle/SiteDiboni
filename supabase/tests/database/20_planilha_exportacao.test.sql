-- Planilha, parte 1: forma de venda única pelo nome e o catálogo exportado para a planilha.
begin;
select plan(14);

-- As regras de faixa são conferidas no fim da transação; no teste, a cada comando.
set constraints all immediate;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
with c as (insert into categorias (nome) values ('Bolos') returning id) insert into ids select 'bolos', id from c;
with c as (insert into categorias (nome, categoria_pai_id) values ('Caixas', (select id from ids where nome = 'bolos')) returning id)
  insert into ids select 'caixas', id from c;
with c as (insert into categorias (nome) values ('Festa') returning id) insert into ids select 'festa', id from c;
with e as (insert into etiquetas (nome) values ('Papel') returning id) insert into ids select 'papel', id from e;

insert into ids select 'caixa', criar_produto(jsonb_build_object(
  'nome', 'Caixa para bolo', 'tipo_venda', 'unidade', 'ncm', '48191000',
  'categorias', jsonb_build_array((select id from ids where nome = 'festa'), (select id from ids where nome = 'caixas')),
  'etiquetas', jsonb_build_array((select id from ids where nome = 'papel')),
  'variacao', jsonb_build_object('nome', 'P', 'codigo_interno', 'CX-P', 'codigo_barras', '7891000000014')));
insert into ids select 'var_p', id from variacoes where codigo_interno = 'CX-P';
with v as (insert into variacoes (produto_id, nome, codigo_interno) values ((select id from ids where nome = 'caixa'), 'G', 'CX-G') returning id)
  insert into ids select 'var_g', id from v;
insert into ids select 'tampa', criar_produto('{"nome":"Tampa","tipo_venda":"unidade","variacao":{"codigo_interno":"TP-1"}}');
insert into ids select 'var_tampa', id from variacoes where codigo_interno = 'TP-1';

with f as (insert into formas_venda (variacao_id, nome, fator, preco_centavos) values ((select id from ids where nome = 'var_p'), 'Pacote com 10', 10, 1500) returning id)
  insert into ids select 'pacote', id from f;
insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values ((select id from ids where nome = 'pacote'), 2, 1400);
insert into formas_venda (variacao_id, nome, fator, preco_centavos, ativa) values ((select id from ids where nome = 'var_p'), 'Unidade', 1, 200, false);

-- Forma única pelo nome dentro da variação
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'formas_venda_nome_por_variacao'),
  'índice das formas pelo nome');
select throws_ok(
  $$insert into formas_venda (variacao_id, nome, fator, preco_centavos) values ((select id from ids where nome = 'var_p'), ' pacote com 10 ', 20, 2800)$$,
  '23505', null, 'mesmo nome na mesma variação, sem diferença de maiúsculas e espaços');
select lives_ok(
  $$insert into formas_venda (variacao_id, nome, fator, preco_centavos) values ((select id from ids where nome = 'var_tampa'), 'Pacote com 10', 10, 900)$$,
  'o mesmo nome em outra variação');

-- Só o administrador exporta
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select throws_ok($$select catalogo_para_planilha()$$, 'P0001', 'Você não tem permissão para acessar esta página.', 'a funcionária não exporta');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table exportado as select catalogo_para_planilha() as j;
create function pg_temp.variacao(p_codigo text) returns jsonb language sql as $$
  select v from exportado, jsonb_array_elements(j -> 'variacoes') v where v ->> 'codigo_interno' = p_codigo
$$;
create function pg_temp.formas(p_codigo text) returns jsonb language sql as $$
  select coalesce(jsonb_agg(f), '[]') from exportado, jsonb_array_elements(j -> 'formas') f where f ->> 'codigo_interno' = p_codigo
$$;

select is(jsonb_array_length((select j -> 'variacoes' from exportado)), 3, 'todas as variações');
select is((select j -> 'variacoes' -> 0 ->> 'codigo_interno' from exportado), 'CX-G', 'em ordem de produto e código');
select is(pg_temp.variacao('CX-P') -> 'categorias', '["Bolos > Caixas", "Festa"]'::jsonb, 'categorias como caminho, em ordem');
select is(pg_temp.variacao('CX-P') -> 'materiais', '["Papel"]'::jsonb, 'materiais');
select ok(pg_temp.variacao('CX-P') @> '{"produto":"Caixa para bolo","variacao":"P","codigo_barras":"7891000000014","ncm":"48191000",
  "tipo_venda":"unidade","controla_validade":false,"apto_forno":false,"estoque_minimo":0,"comprimento_mm":null,
  "tem_formas":true,"tem_movimentacoes":false,"tem_saldo":false}'::jsonb, 'os campos da variação e do produto');
select is((pg_temp.variacao('CX-G') ->> 'produto_id')::uuid, (select id from ids where nome = 'caixa'), 'o produto de cada variação');
select is(pg_temp.variacao('CX-G') ->> 'tem_formas', 'false', 'variação sem forma');
select is(pg_temp.formas('CX-P'),
  '[{"codigo_interno":"CX-P","forma":"Pacote com 10","fator":10,"preco_centavos":1500,"faixas":[{"quantidade_minima":2,"preco_centavos":1400}]}]'::jsonb,
  'só a forma ativa, com as faixas');
select is(jsonb_array_length(pg_temp.formas('TP-1')), 1, 'as formas das outras variações');

-- Movimentação e saldo
select registrar_entrada_manual((select id from ids where nome = 'var_p'), 10, 0.5, 'compra');
select ok(catalogo_para_planilha() -> 'variacoes' @> '[{"codigo_interno":"CX-P","tem_movimentacoes":true,"tem_saldo":true}]'::jsonb,
  'depois da entrada, o produto tem movimentações e saldo');

select * from finish();
rollback;
