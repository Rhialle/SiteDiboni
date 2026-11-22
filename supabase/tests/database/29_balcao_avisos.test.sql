-- Balcão, parte 3: avisos do Início (vendas sem saldo, caixa com diferença, caixa aberto de outro dia).
begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select criar_produto('{"nome":"Tampa","tipo_venda":"unidade","variacao":{"codigo_interno":"TP-1"}}');
insert into formas_venda (variacao_id, nome, fator, preco_centavos)
  values ((select id from variacoes where codigo_interno = 'TP-1'), 'Unidade', 1, 50);

-- Sem nada: zeros
select results_eq($$select vendas_sem_saldo, caixas_com_diferenca from avisos_inicio()$$, $$values (0, 0)$$, 'sem avisos do balcão');

-- Uma venda sem saldo (a Tampa não tem estoque)
select abrir_caixa(0);
select * from registrar_venda(
  jsonb_build_array(jsonb_build_object('forma_venda_id', (select id from formas_venda limit 1), 'quantidade', 1)), 0,
  jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor_centavos', 50)), 50);
select is((select vendas_sem_saldo from avisos_inicio()), 1, 'o administrador vê a venda sem saldo a conferir');

-- Fechado com diferença (contou R$ 1,00 a menos)
select * from fechar_caixa(0);
select is((select caixas_com_diferenca from avisos_inicio()), 0, 'fechar sem diferença não avisa');
select tests.sair();
insert into caixas (situacao, aberto_por, troco_inicial_centavos, fechado_por, fechado_em,
  esperado_dinheiro_centavos, informado_dinheiro_centavos, esperado_credito_centavos, esperado_debito_centavos, esperado_pix_centavos)
values ('fechado', '00000000-0000-0000-0000-00000000000a', 0, '00000000-0000-0000-0000-00000000000a', now(), 100, 0, 0, 0, 0);
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select is((select caixas_com_diferenca from avisos_inicio()), 1, 'o administrador vê o caixa com diferença');

-- A funcionária não vê esses dois
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select results_eq($$select vendas_sem_saldo, caixas_com_diferenca from avisos_inicio()$$, $$values (0, 0)$$,
  'a funcionária não vê vendas sem saldo nem caixas com diferença');

-- Caixa aberto ontem: todos veem a data
select ok((select caixa_aberto_desde from avisos_inicio()) is null, 'sem caixa aberto de outro dia');
select tests.sair();
insert into caixas (aberto_por, aberto_em, troco_inicial_centavos)
values ('00000000-0000-0000-0000-00000000000a', now() - interval '2 days', 0);
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select ok((select caixa_aberto_desde from avisos_inicio()) is not null, 'caixa aberto há dois dias aparece para a funcionária');

select * from finish();
rollback;
