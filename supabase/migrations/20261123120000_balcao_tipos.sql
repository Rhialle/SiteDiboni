-- Balcão (fase 2.1): tipos novos. Os valores novos de tipo_movimentacao ficam numa migração só
-- deles, porque um valor acrescentado a um enum só pode ser usado depois de gravado.

alter type public.tipo_movimentacao add value 'venda';
alter type public.tipo_movimentacao add value 'entrada_venda_sem_saldo';

create type public.situacao_caixa as enum ('aberto', 'fechado');
create type public.situacao_venda as enum ('concluida', 'cancelada');
create type public.forma_pagamento as enum ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix');
create type public.tipo_movimento_caixa as enum ('retirada', 'reforco');
