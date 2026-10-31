-- Inventário, parte 2: contagem às cegas, lote desconhecido, revisão e aprovação (seção 7).
begin;
select plan(35);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

create temp table ids (nome text primary key, id text);
insert into ids select 'forminha', criar_produto(
  '{"nome":"Forminha de pão","tipo_venda":"unidade","variacao":{"nome":"N4","codigo_interno":"FM-1","codigo_barras":"7891000000014"}}')::text;
insert into variacoes (produto_id, nome, codigo_interno) values ((select id::uuid from ids where nome = 'forminha'), 'N5', 'FM-2');
select criar_produto('{"nome":"Granulado","tipo_venda":"peso","controla_validade":true,"variacao":{"nome":"Chocolate","codigo_interno":"GR-1"}}');
select criar_produto('{"nome":"Tampa","tipo_venda":"unidade","variacao":{"codigo_interno":"TP-1"}}');

create function pg_temp.var(p_codigo text) returns uuid language sql as $$ select id from variacoes where codigo_interno = p_codigo $$;
create function pg_temp.lote(p_codigo text, p_lote text) returns uuid language sql as $$
  select id from lotes where variacao_id = pg_temp.var(p_codigo) and codigo = p_lote
$$;
create function pg_temp.saldo(p_lote uuid) returns bigint language sql as $$ select coalesce((select quantidade from saldos where lote_id = p_lote), 0) $$;
create function pg_temp.inv(p_nome text) returns bigint language sql as $$ select id::bigint from ids where nome = p_nome $$;

-- Estoque: FM-1 100 un (custo 0,05), FM-2 30 un, GR-1 lote L-A 1000 g e lote vencido L-V 200 g
select registrar_entrada_manual(pg_temp.var('FM-1'), 100, 0.05, 'compra');
select registrar_entrada_manual(pg_temp.var('FM-2'), 30, 0.05, 'compra');
select registrar_entrada_manual(pg_temp.var('GR-1'), 1000, 0.03, 'compra', hoje_sp() + 60, 'L-A');
select tests.sair();
select entrar_no_estoque(pg_temp.var('GR-1'), 200, 0.03, hoje_sp() - 1, 'L-V', 'entrada_manual', 'vencido',
  '00000000-0000-0000-0000-00000000000a');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

insert into ids select 'inv', abrir_inventario('Prateleira', 'variacoes', '{}', array['FM-1', 'FM-2', 'GR-1'])::text;

-- Busca às cegas: sem acento, por código interno e por código de barras, sem nenhum saldo
select is((select count(*) from itens_para_contar(pg_temp.inv('inv'), 'pao')), 2::bigint, 'acha "pão" por "pao" (as duas variações)');
select is((select codigo_interno from itens_para_contar(pg_temp.inv('inv'), 'fm-1')), 'FM-1', 'acha pelo código interno');
select is((select codigo_interno from itens_para_contar(pg_temp.inv('inv'), '7891000000014')), 'FM-1', 'acha pelo código de barras');
select is((select count(*) from itens_para_contar(pg_temp.inv('inv'), 'tampa')), 0::bigint, 'não acha o que está fora do escopo');
select ok(pg_get_function_result('itens_para_contar(bigint,text)'::regprocedure) not ilike '%saldo%', 'nenhuma coluna de saldo');
select ok((select string_agg(lotes::text, '') from itens_para_contar(pg_temp.inv('inv'), '')) not ilike '%saldo%', 'os lotes não trazem saldo');
select is(
  (select jsonb_array_length(lotes) from itens_para_contar(pg_temp.inv('inv'), 'granulado')), 2,
  'produto com validade traz os lotes que têm saldo');

-- Contagem no lote geral grava o saldo do momento
select lives_ok($$select contar_item(pg_temp.inv('inv'), pg_temp.var('FM-1'), null, 90)$$, 'conta o produto sem validade');
select results_eq(
  $$select saldo_no_momento, quantidade_contada from inventario_itens where lote_id = pg_temp.lote('FM-1', 'GERAL')$$,
  $$values (100::bigint, 90::bigint)$$, 'no lote geral, com o saldo do momento');

-- Contar de novo substitui
select contar_item(pg_temp.inv('inv'), pg_temp.var('GR-1'), pg_temp.lote('GR-1', 'L-A'), 900);
select contar_item(pg_temp.inv('inv'), pg_temp.var('GR-1'), pg_temp.lote('GR-1', 'L-A'), 950);
select results_eq(
  $$select count(*), max(quantidade_contada) from inventario_itens where lote_id = pg_temp.lote('GR-1', 'L-A')$$,
  $$values (1::bigint, 950::bigint)$$, 'contar de novo substitui a contagem');
select is(
  (select (l ->> 'contado')::bigint from itens_para_contar(pg_temp.inv('inv'), 'granulado') i, jsonb_array_elements(i.lotes) l
   where l ->> 'codigo' = 'L-A'),
  950::bigint, 'a busca mostra o que já foi contado');

-- Lote vencido contado com 0
select contar_item(pg_temp.inv('inv'), pg_temp.var('GR-1'), pg_temp.lote('GR-1', 'L-V'), 0);

-- Lote que não está no sistema
select throws_ok($$select contar_item(pg_temp.inv('inv'), pg_temp.var('GR-1'), null, 100)$$, 'P0001',
  'Informe a validade do lote.', 'lote novo sem validade');
select lives_ok($$select contar_item(pg_temp.inv('inv'), pg_temp.var('GR-1'), null, 100, hoje_sp() + 90)$$, 'lote novo com validade');
select is(pg_temp.saldo(pg_temp.lote('GR-1', 'INV-' || to_char(hoje_sp(), 'YYYY-MM-DD'))), 0::bigint, 'o lote INV nasce com saldo zero');
select contar_item(pg_temp.inv('inv'), pg_temp.var('GR-1'), null, 40, hoje_sp() + 120);
select ok(pg_temp.lote('GR-1', 'INV-' || to_char(hoje_sp(), 'YYYY-MM-DD') || '-2') is not null, 'o segundo do dia ganha -2');
select throws_ok($$select contar_item(pg_temp.inv('inv'), pg_temp.var('GR-1'), null, 10, hoje_sp() + 30, 'L-A')$$, 'P0001',
  'O lote L-A já existe com validade ' || to_char(hoje_sp() + 60, 'DD/MM/YYYY') || '.', 'lote existente com outra validade');

-- Fora do escopo
select throws_ok($$select contar_item(pg_temp.inv('inv'), pg_temp.var('TP-1'), null, 1)$$, 'P0001',
  'Este item não está no escopo do inventário.', 'item fora do escopo');

-- A funcionária conta, mas não revisa nem aprova
select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal2');
select is((select count(*) from itens_para_contar(pg_temp.inv('inv'), 'pao')), 2::bigint, 'a funcionária busca igual');
select is((select count(*) from inventario_itens), 0::bigint, 'a funcionária não lê os itens (saldo do momento)');
select throws_ok($$select * from revisao_inventario(pg_temp.inv('inv'))$$, 'P0001',
  'Você não tem permissão para acessar esta página.', 'a funcionária não revisa');
select throws_ok($$select aprovar_inventario(pg_temp.inv('inv'))$$, 'P0001',
  'Você não tem permissão para acessar esta página.', 'a funcionária não aprova');
select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');

-- Perda depois da contagem (FM-1 fica com 95); encerrar fecha a contagem
select registrar_perda_ou_ajuste(pg_temp.var('FM-1'), pg_temp.lote('FM-1', 'GERAL'), 'perda_avaria', -5, 'molhou');
select encerrar_contagem(pg_temp.inv('inv'));
select throws_ok($$select contar_item(pg_temp.inv('inv'), pg_temp.var('FM-1'), null, 1)$$, 'P0001',
  'Este inventário não está mais em contagem.', 'em revisão não aceita contagem');

-- Revisão e resumo
select results_eq(
  $$select saldo_no_momento, contado, diferenca, valor_centavos from revisao_inventario(pg_temp.inv('inv'))
    where lote_id = pg_temp.lote('FM-1', 'GERAL')$$,
  $$values (100::bigint, 90::bigint, -10::bigint, 50::bigint)$$, 'diferença e valor (10 × 0,05)');
select results_eq(
  $$select itens_contados, variacoes_no_escopo, variacoes_contadas from resumo_inventario(pg_temp.inv('inv'))$$,
  $$values (5, 3, 2)$$, 'resumo: itens contados e variações do escopo');
select ok((select primeira_contagem is not null and ultima_contagem >= primeira_contagem from resumo_inventario(pg_temp.inv('inv'))),
  'primeira e última contagem');

-- Aprovação: contado − saldo do momento; a perda feita depois fica
select is(aprovar_inventario(pg_temp.inv('inv')), 5, 'cinco ajustes');
select is(pg_temp.saldo(pg_temp.lote('FM-1', 'GERAL')), 85::bigint, 'FM-1: 95 − 10 = 85 (a perda depois da contagem foi preservada)');
select is(pg_temp.saldo(pg_temp.lote('FM-2', 'GERAL')), 30::bigint, 'item não contado não muda');
select is(pg_temp.saldo(pg_temp.lote('GR-1', 'L-V')), 0::bigint, 'lote vencido contado 0 zera');
select is(pg_temp.saldo(pg_temp.lote('GR-1', 'INV-' || to_char(hoje_sp(), 'YYYY-MM-DD'))), 100::bigint, 'o lote novo recebe o contado');
select results_eq(
  $$select tipo::text, quantidade, motivo, aprovado_por from movimentacoes where lote_id = pg_temp.lote('FM-1', 'GERAL') and tipo = 'ajuste_inventario'$$,
  $$values ('ajuste_inventario'::text, -10::bigint, 'Inventário nº ' || pg_temp.inv('inv'), '00000000-0000-0000-0000-00000000000a'::uuid)$$,
  'movimentação de ajuste de inventário com o motivo e quem aprovou');
select is((select situacao::text from inventarios where id = pg_temp.inv('inv')), 'aprovado', 'aprovado');

-- R1: o estoque baixou depois da contagem e o ajuste deixaria o saldo negativo
insert into ids select 'r1', abrir_inventario('R1', 'variacoes', '{}', array['FM-2'])::text;
select contar_item(pg_temp.inv('r1'), pg_temp.var('FM-2'), null, 2);
select registrar_perda_ou_ajuste(pg_temp.var('FM-2'), pg_temp.lote('FM-2', 'GERAL'), 'perda_avaria', -5, 'quebrou');
select encerrar_contagem(pg_temp.inv('r1'));
select throws_ok($$select aprovar_inventario(pg_temp.inv('r1'))$$, 'P0001',
  'Forminha de pão – N5 (lote GERAL): o ajuste de -28 un deixaria o saldo negativo (há 25 un agora). Nada foi ajustado.',
  'mostra o item que esbarrou na R1');
select is(pg_temp.saldo(pg_temp.lote('FM-2', 'GERAL')), 25::bigint, 'nada foi ajustado');
select is((select situacao::text from inventarios where id = pg_temp.inv('r1')), 'em_revisao', 'continua em revisão');

select * from finish();
rollback;
