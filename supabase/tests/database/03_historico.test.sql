begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test'),
  ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
update configuracoes set limite_ajuste_centavos = 8000;
select tests.sair();

select results_eq(
  $$select campo, valor_antigo, valor_novo, usuario_id::text
      from historico_cadastro where tabela = 'configuracoes'$$,
  $$values ('limite_ajuste_centavos', '5000', '8000', '00000000-0000-0000-0000-00000000000a')$$,
  'mudança de configuração fica no histórico com quem mudou'
);

select tests.entrar_como('00000000-0000-0000-0000-00000000000b');
select is((select count(*) from historico_cadastro), 0::bigint, 'funcionário não lê o histórico');
select tests.sair();

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select throws_ok(
  $$insert into historico_cadastro (tabela, campo) values ('x', 'y')$$,
  '42501',
  null,
  'ninguém escreve no histórico diretamente'
);
select throws_ok(
  $$delete from historico_cadastro$$,
  '42501',
  null,
  'ninguém apaga o histórico'
);
select tests.sair();

select * from finish();
rollback;
