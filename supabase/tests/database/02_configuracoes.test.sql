begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test'),
  ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');

select is((select limite_ajuste_centavos from configuracoes), 5000, 'limite padrão é R$ 50,00');
select is(
  (select dias_alerta_validade from configuracoes),
  '{30,15,7}'::int[],
  'alertas padrão em 30, 15 e 7 dias'
);

select ok(cnpj_valido('11222333000181'), 'CNPJ com dígitos certos é válido');
select ok(not cnpj_valido('11222333000182'), 'CNPJ com dígito errado é inválido');
select ok(not cnpj_valido('00000000000000'), 'CNPJ com todos os dígitos iguais é inválido');

select throws_ok(
  $$update configuracoes set cnpj_loja = '11222333000182'$$,
  '23514',
  null,
  'banco recusa CNPJ inválido'
);
select throws_ok(
  $$insert into configuracoes (id) values (2)$$,
  '23514',
  null,
  'só existe uma linha de configuração'
);

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
update configuracoes set limite_ajuste_centavos = 9000;
select tests.sair();
select is(
  (select limite_ajuste_centavos from configuracoes),
  5000,
  'funcionário não altera configurações'
);

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
update configuracoes set limite_ajuste_centavos = 7000;
select tests.sair();
select is(
  (select limite_ajuste_centavos from configuracoes),
  7000,
  'administrador altera configurações'
);

select * from finish();
rollback;
