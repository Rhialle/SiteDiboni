-- Inventário, parte 1: abertura com escopo, um em andamento por vez, situações e permissões.
begin;
select plan(23);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id text);
with c as (insert into categorias (nome) values ('Bolos') returning id) insert into ids select 'bolos', id from c;
with c as (insert into categorias (nome, categoria_pai_id) values ('Caixas', (select id::uuid from ids where nome = 'bolos')) returning id)
  insert into ids select 'caixas', id from c;
with c as (insert into categorias (nome) values ('Festa') returning id) insert into ids select 'festa', id from c;
select criar_produto(jsonb_build_object('nome', 'Caixa', 'tipo_venda', 'unidade',
  'categorias', jsonb_build_array((select id from ids where nome = 'caixas')), 'variacao', '{"codigo_interno":"CX-P"}'::jsonb));
select criar_produto(jsonb_build_object('nome', 'Balão', 'tipo_venda', 'unidade',
  'categorias', jsonb_build_array((select id from ids where nome = 'festa')), 'variacao', '{"codigo_interno":"BL-1"}'::jsonb));
select criar_produto('{"nome":"Tampa","tipo_venda":"unidade","variacao":{"codigo_interno":"TP-1"}}');

create function pg_temp.situacao(p_nome text) returns text language sql as $$
  select situacao::text from inventarios where id = (select id::bigint from ids where nome = p_nome)
$$;
create function pg_temp.id(p_nome text) returns bigint language sql as $$ select id::bigint from ids where nome = p_nome $$;

-- Só o administrador abre
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select throws_ok($$select abrir_inventario('Prateleira', 'loja', '{}', '{}')$$, 'P0001',
  'Você não tem permissão para acessar esta página.', 'a funcionária não abre');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

-- Loja inteira, descrição padrão, um em andamento por vez
insert into ids select 'loja', abrir_inventario('', 'loja', '{}', '{}')::text;
select is(pg_temp.situacao('loja'), 'aberto', 'abre em contagem');
select is((select descricao from inventarios where id = pg_temp.id('loja')),
  'Inventário de ' || to_char(hoje_sp(), 'DD/MM/YYYY'), 'descrição vazia vira a data de São Paulo');
select throws_ok($$select abrir_inventario('Outro', 'loja', '{}', '{}')$$, 'P0001',
  'Já existe um inventário em andamento: termine ou cancele antes de abrir outro.', 'um em contagem por vez');

-- Situações
select lives_ok($$select encerrar_contagem(pg_temp.id('loja'))$$, 'encerra a contagem');
select is(pg_temp.situacao('loja'), 'em_revisao', 'em revisão');
select throws_ok($$select abrir_inventario('Outro', 'loja', '{}', '{}')$$, 'P0001',
  'Já existe um inventário em andamento: termine ou cancele antes de abrir outro.', 'em revisão também conta como em andamento');
select lives_ok($$select reabrir_contagem(pg_temp.id('loja'))$$, 'volta a contar');
select is(pg_temp.situacao('loja'), 'aberto', 'em contagem de novo');
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select throws_ok($$select encerrar_contagem(pg_temp.id('loja'))$$, 'P0001',
  'Você não tem permissão para acessar esta página.', 'a funcionária não encerra');
select throws_ok($$select cancelar_inventario(pg_temp.id('loja'))$$, 'P0001',
  'Você não tem permissão para acessar esta página.', 'a funcionária não cancela');
select ok((select count(*) from inventarios) = 1, 'a funcionária lê a lista');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select lives_ok($$select cancelar_inventario(pg_temp.id('loja'))$$, 'cancela');
select is(pg_temp.situacao('loja'), 'cancelado', 'cancelado');
select throws_ok($$select encerrar_contagem(pg_temp.id('loja'))$$, 'P0001',
  'Este inventário não está mais em contagem.', 'cancelado não encerra');
select throws_ok($$select reabrir_contagem(pg_temp.id('loja'))$$, 'P0001',
  'Este inventário não está mais em revisão.', 'cancelado não volta a contar');

-- Escopo por categoria inclui as subcategorias
insert into ids select 'bolos_inv', abrir_inventario('Bolos', 'categorias', array[(select id::uuid from ids where nome = 'bolos')], '{}')::text;
select tests.sair();
select results_eq(
  $$select v.codigo_interno from variacoes v where v.id in (select variacoes_do_inventario((select id::bigint from ids where nome = 'bolos_inv'))) order by 1$$,
  $$values ('CX-P'::text)$$, 'Bolos inclui Bolos > Caixas e não inclui Festa');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select cancelar_inventario(pg_temp.id('bolos_inv'));

-- Escopo por variações, pelo código interno normalizado
insert into ids select 'codigos', abrir_inventario('Códigos', 'variacoes', '{}', array[' cx-p ', 'tp-1'])::text;
select tests.sair();
select results_eq(
  $$select v.codigo_interno from variacoes v where v.id in (select variacoes_do_inventario((select id::bigint from ids where nome = 'codigos'))) order by 1$$,
  $$values ('CX-P'::text), ('TP-1')$$, 'acha as variações pelos códigos');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select cancelar_inventario(pg_temp.id('codigos'));
select throws_ok($$select abrir_inventario('X', 'variacoes', '{}', array['XX-9', 'cx-p'])$$, 'P0001',
  'Código interno não encontrado: XX-9.', 'código que não existe');
select throws_ok($$select abrir_inventario('X', 'categorias', '{}', '{}')$$, 'P0001',
  'Escolha pelo menos uma categoria.', 'categorias vazias');
select throws_ok($$select abrir_inventario('X', 'variacoes', '{}', '{}')$$, 'P0001',
  'Informe pelo menos um código interno.', 'códigos vazios');

-- Ninguém grava direto nas tabelas
select throws_ok($$insert into inventarios (descricao, escopo, aberto_por) values ('x', 'loja', auth.uid())$$, '42501', null,
  'inventarios só pelas funções');
select throws_ok($$delete from inventario_itens$$, '42501', null, 'inventario_itens só pelas funções');

select * from finish();
rollback;
