begin;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test'),
  ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id uuid);
insert into ids select 'caixa', criar_produto('{"nome":"Caixa","tipo_venda":"unidade"}');
insert into ids select 'variacao', id from variacoes where produto_id = (select id from ids where nome = 'caixa');
with c as (insert into categorias (nome) values ('Bolos') returning id) insert into ids select 'bolos', id from c;

create function pg_temp.situacao() returns text language sql as
  $$select situacao from produtos_com_situacao where id = (select id from ids where nome = 'caixa')$$;
create function pg_temp.pendencias() returns text[] language sql as
  $$select pendencias from produtos_com_situacao where id = (select id from ids where nome = 'caixa')$$;

select is(pg_temp.situacao(), 'incompleto', 'produto novo é incompleto');
select is(pg_temp.pendencias(), '{"variação ativa com forma de venda",categoria,foto,NCM}'::text[], 'lista tudo o que falta');

-- Completa o cadastro
update produtos set ncm = '48191000' where id = (select id from ids where nome = 'caixa');
insert into produto_categorias values ((select id from ids where nome = 'caixa'), (select id from ids where nome = 'bolos'));
with f as (
  insert into formas_venda (variacao_id, nome, fator, preco_centavos)
  values ((select id from ids where nome = 'variacao'), 'Unidade', 1, 250) returning id
) insert into ids select 'forma', id from f;
with f as (
  insert into fotos (produto_id, caminho) values ((select id from ids where nome = 'caixa'), 'caixa/1.jpg') returning id
) insert into ids select 'foto', id from f;

select is(pg_temp.situacao(), 'ativo', 'completo vira ativo sozinho');
select is(pg_temp.pendencias(), '{}'::text[], 'nada falta');

delete from fotos where id = (select id from ids where nome = 'foto');
select is(pg_temp.situacao(), 'incompleto', 'sem foto volta a incompleto');
select is(pg_temp.pendencias(), '{foto}'::text[], 'falta só a foto');

insert into fotos (produto_id, caminho) values ((select id from ids where nome = 'caixa'), 'caixa/2.jpg');
update produtos set inativo = true where id = (select id from ids where nome = 'caixa');
select is(pg_temp.situacao(), 'inativo', 'inativo prevalece mesmo completo');
update produtos set inativo = false where id = (select id from ids where nome = 'caixa');
select is(pg_temp.situacao(), 'ativo', 'reativado volta a ativo');

update variacoes set ativa = false where id = (select id from ids where nome = 'variacao');
select ok('variação ativa com forma de venda' = any(pg_temp.pendencias()), 'variação inativa não conta');
update variacoes set ativa = true where id = (select id from ids where nome = 'variacao');
update formas_venda set ativa = false where id = (select id from ids where nome = 'forma');
select ok('variação ativa com forma de venda' = any(pg_temp.pendencias()), 'forma inativa não conta');
update formas_venda set ativa = true where id = (select id from ids where nome = 'forma');
select is(pg_temp.situacao(), 'ativo', 'tudo ativo de novo');

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select is((select count(*) from produtos_com_situacao), 1::bigint, 'funcionária lê a situação');

select * from finish();
rollback;
