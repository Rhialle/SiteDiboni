begin;
select plan(16);

-- As regras de faixa são conferidas no fim da transação; no teste, a cada comando.
set constraints all immediate;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'forminha', criar_produto('{"nome":"Forminha","tipo_venda":"unidade","variacao":{"nome":"Marrom"}}');
insert into ids select 'granulado', criar_produto('{"nome":"Granulado","tipo_venda":"peso","variacao":{"nome":"Chocolate"}}');
insert into ids select 'var_forminha', id from variacoes where produto_id = (select id from ids where nome = 'forminha');
insert into ids select 'var_granulado', id from variacoes where produto_id = (select id from ids where nome = 'granulado');

-- Granel só em produto por peso, com fator 1000, uma vez por variação
select throws_ok(
  $$insert into formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel)
    values ((select id from ids where nome = 'var_forminha'), 'Granel', 1000, 3200, true)$$,
  'P0001', 'Só produto vendido por peso tem forma a granel.', 'granel em produto por unidade');
select throws_ok(
  $$insert into formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel)
    values ((select id from ids where nome = 'var_granulado'), 'Granel', 500, 3200, true)$$,
  '23514', null, 'granel exige fator 1000');
select lives_ok(
  $$insert into formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel)
    values ((select id from ids where nome = 'var_granulado'), 'Granel', 1000, 3200, true)$$,
  'granel em produto por peso');
select throws_ok(
  $$insert into formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel)
    values ((select id from ids where nome = 'var_granulado'), 'Granel 2', 1000, 3000, true)$$,
  '23505', null, 'só uma forma a granel por variação');

-- Faixas de preço: cada uma mais barata que o preço normal e que a anterior
with f as (
  insert into formas_venda (variacao_id, nome, fator, preco_centavos)
  values ((select id from ids where nome = 'var_forminha'), 'Pacote com 100', 100, 600) returning id
) insert into ids select 'pacote', id from f;
insert into ids select 'granel', id from formas_venda where peso_variavel;

select lives_ok(
  $$insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values ((select id from ids where nome = 'pacote'), 10, 540)$$,
  'faixa 10+ a 5,40');
select throws_ok(
  $$insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values ((select id from ids where nome = 'pacote'), 20, 550)$$,
  'P0001', 'O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.', 'faixa mais cara que a anterior');
select throws_ok(
  $$insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values ((select id from ids where nome = 'pacote'), 5, 600)$$,
  'P0001', 'O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.', 'faixa igual ao preço normal');
select throws_ok(
  $$insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values ((select id from ids where nome = 'pacote'), 10, 500)$$,
  '23505', null, 'quantidade mínima repetida');
select throws_ok(
  $$insert into faixas_preco (forma_venda_id, quantidade_minima, preco_centavos) values ((select id from ids where nome = 'granel'), 10, 3000)$$,
  'P0001', 'Forma a granel não tem faixas de preço.', 'granel não tem faixas');
select throws_ok(
  $$update formas_venda set preco_centavos = 500 where id = (select id from ids where nome = 'pacote')$$,
  'P0001', 'O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.', 'preço normal abaixo da faixa');
select throws_ok($$delete from formas_venda where id = (select id from ids where nome = 'pacote')$$, '42501', null,
  'forma de venda não se apaga');

-- Trocar o tipo de venda só quando as formas combinam
select throws_ok(
  $$update produtos set tipo_venda = 'peso' where id = (select id from ids where nome = 'forminha')$$,
  'P0001', 'Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele.', 'unidade para peso com pacote');
select throws_ok(
  $$update produtos set tipo_venda = 'unidade' where id = (select id from ids where nome = 'granulado')$$,
  'P0001', 'Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele.', 'peso para unidade com granel');

-- Compatibilidades valem nos dois sentidos, sem repetir
select lives_ok(
  $$insert into compatibilidades (variacao_a_id, variacao_b_id, descricao)
    values ((select id from ids where nome = 'var_forminha'), (select id from ids where nome = 'var_granulado'), 'combina')$$,
  'liga duas variações');
select throws_ok(
  $$insert into compatibilidades (variacao_a_id, variacao_b_id)
    values ((select id from ids where nome = 'var_granulado'), (select id from ids where nome = 'var_forminha'))$$,
  '23505', null, 'o mesmo par ao contrário é repetição');
select throws_ok(
  $$insert into compatibilidades (variacao_a_id, variacao_b_id)
    values ((select id from ids where nome = 'var_forminha'), (select id from ids where nome = 'var_forminha'))$$,
  '23514', null, 'variação não combina consigo mesma');

select * from finish();
rollback;
