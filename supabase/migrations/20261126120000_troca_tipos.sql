-- Troca no balcão (fase 2.4): a entrada do produto devolvido. Numa migração própria, porque um valor
-- novo de enum só pode ser usado depois de a transação que o criou terminar.
alter type public.tipo_movimentacao add value 'entrada_troca';
