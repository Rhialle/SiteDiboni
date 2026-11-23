-- Balcão, parte 1: o caixa (abrir com troco, retirada e reforço, fechar às cegas, conferir).
begin;
select plan(27);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');

-- A funcionária abre o caixa
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select is((select count(*) from caixa_aberto()), 0::bigint, 'sem caixa aberto, nenhuma linha');
select throws_ok($$select abrir_caixa(-1)$$, 'P0001', 'O troco inicial não pode ser negativo.', 'troco negativo é recusado');
select lives_ok($$select abrir_caixa(5000)$$, 'a funcionária abre o caixa com R$ 50,00');
select is((select troco_inicial_centavos from caixa_aberto()), 5000, 'o caixa aberto mostra o troco inicial');
select throws_ok($$select abrir_caixa(0)$$, 'P0001', 'Já existe um caixa aberto.', 'não abre um segundo caixa');

-- Retirada e reforço
select lives_ok($$select registrar_movimento_caixa('reforco', 2000, 'mais troco')$$, 'reforço de R$ 20,00');
select lives_ok($$select registrar_movimento_caixa('retirada', 1500, 'entregador')$$, 'retirada de R$ 15,00');
select throws_ok($$select registrar_movimento_caixa('retirada', 100, '  ')$$, 'P0001', 'Informe o motivo.', 'retirada sem motivo');
select throws_ok($$select registrar_movimento_caixa('retirada', 0, 'nada')$$, 'P0001', 'Informe um valor maior que zero.', 'valor zero');
select is((select jsonb_array_length(movimentos) from caixa_aberto()), 2, 'o caixa aberto lista os dois movimentos');
select ok(pg_get_function_result('caixa_aberto()'::regprocedure) not ilike '%esperado%', 'o caixa aberto não mostra o esperado');

-- A tabela de caixas só abre para o administrador
select is((select count(*) from caixas), 0::bigint, 'a funcionária não lê a tabela de caixas');

-- Fechar às cegas
select throws_ok($$select * from fechar_caixa(null)$$, 'P0001', 'Informe o dinheiro contado na gaveta.', 'fechar sem o dinheiro contado');
create temp table ultimo_fechamento as select * from fechar_caixa(5400);
create function pg_temp.fechamento(p_forma text) returns table (esperado integer, informado integer, diferenca integer)
language sql as $$
  select esperado_centavos, informado_centavos, diferenca_centavos from pg_temp.ultimo_fechamento where forma::text = p_forma
$$;

select results_eq($$select * from pg_temp.fechamento('dinheiro')$$, $$values (5500, 5400, -100)$$,
  'dinheiro: esperado = troco + reforço − retirada; diferença −R$ 1,00');
select results_eq($$select * from pg_temp.fechamento('cartao_credito')$$, $$values (0, null::integer, null::integer)$$,
  'crédito sem valor informado não tem diferença');
select throws_ok($$select * from fechar_caixa(0)$$, 'P0001', 'Não há caixa aberto.', 'não fecha duas vezes');
select throws_ok($$select registrar_movimento_caixa('reforco', 100, 'x')$$, 'P0001', 'Não há caixa aberto.', 'movimento sem caixa aberto');
select is((select count(*) from resumo_fechamento((select id from caixas_fechados() limit 1))), 4::bigint,
  'quem fechou vê o resumo do fechamento');
select is((select count(*) from caixas_fechados()), 1::bigint, 'a funcionária vê o caixa que ela fechou');

-- O administrador abre e fecha outro caixa
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select abrir_caixa(0);
select * from fechar_caixa(0);
select is((select count(*) from caixas_fechados()), 2::bigint, 'o administrador vê todos os caixas fechados');

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select is((select count(*) from caixas_fechados()), 1::bigint, 'a funcionária continua vendo só o dela');
select throws_ok($$select * from resumo_fechamento(999999)$$, 'P0001', 'Caixa não encontrado.', 'caixa inexistente');
select throws_ok(
  $$select * from resumo_fechamento((select max(id) from caixas_fechados()) + 1)$$, 'P0001', 'Caixa não encontrado.',
  'caixa do administrador não aparece para a funcionária');
select throws_ok($$select conferir_caixa(1)$$, 'P0001', 'Você não tem permissão para acessar esta página.',
  'a funcionária não confere caixa');

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
select lives_ok(format($$select conferir_caixa(%s)$$, (select min(id) from caixas)), 'o administrador confere o caixa com diferença');
select ok((select conferido from caixas_fechados() where id = (select min(id) from caixas)), 'o caixa fica conferido');

select results_eq($$select limite_desconto_percentual, largura_cupom_mm from configuracoes$$, $$values (10, 80)$$,
  'limite de desconto 10% e cupom de 80 mm por padrão');

select * from finish();
rollback;
