begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test', '{"nome":"Dona"}'),
  ('00000000-0000-0000-0000-00000000000b', 'func@loja.test', '{"nome":"Func"}');

select is(
  (select papel::text from usuarios where id = '00000000-0000-0000-0000-00000000000a'),
  'administrador',
  'primeiro usuário vira administrador'
);
select is(
  (select papel::text from usuarios where id = '00000000-0000-0000-0000-00000000000b'),
  'funcionario',
  'demais viram funcionário'
);
select is(
  (select nome from usuarios where id = '00000000-0000-0000-0000-00000000000a'),
  'Dona',
  'nome vem dos metadados'
);

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal1');
select ok(not eh_administrador(), 'sem duas etapas não é administrador');

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select ok(eh_administrador(), 'com duas etapas é administrador');
select throws_ok(
  $$update usuarios set ativo = false where id = '00000000-0000-0000-0000-00000000000a'$$,
  'P0001',
  'Precisa existir pelo menos um administrador ativo.',
  'não desativa o último administrador'
);
select throws_ok(
  $$update usuarios set papel = 'funcionario' where id = '00000000-0000-0000-0000-00000000000a'$$,
  'P0001',
  'Precisa existir pelo menos um administrador ativo.',
  'não rebaixa o último administrador'
);

select tests.entrar_como('00000000-0000-0000-0000-00000000000b');
update usuarios set nome = 'Invasora' where id = '00000000-0000-0000-0000-00000000000a';
select tests.sair();
select is(
  (select nome from usuarios where id = '00000000-0000-0000-0000-00000000000a'),
  'Dona',
  'funcionário não altera usuários'
);

update usuarios set ativo = false where id = '00000000-0000-0000-0000-00000000000b';
select tests.entrar_como('00000000-0000-0000-0000-00000000000b');
select is((select count(*) from usuarios), 0::bigint, 'usuário inativo não lê nada');
select tests.sair();

set local role anon;
select throws_ok($$select count(*) from usuarios$$, '42501', null, 'anônimo não tem permissão');

select * from finish();
rollback;
