-- Estoque, parte 2: entradas (R6 e R7) e custo médio (R9).

-- Entrada no estoque, usada pela entrada manual e, no plano 1.4, pela confirmação da nota.
-- Escolhe ou cria o lote, soma ao saldo, guarda o custo da entrada e recalcula o custo médio.
create function public.entrar_no_estoque(
  p_variacao uuid,
  p_quantidade bigint,
  p_custo_unitario numeric,
  p_validade date,
  p_codigo_lote text,
  p_tipo public.tipo_movimentacao,
  p_motivo text,
  p_usuario uuid,
  p_origem text default null,
  p_origem_id text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controla boolean;
  v_codigo text := nullif(trim(p_codigo_lote), '');
  v_lote uuid;
  v_validade_lote date;
  v_saldo_total bigint;
  v_custo_medio numeric;
  v_novo_custo numeric;
  v_id bigint;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Informe uma quantidade inteira maior que zero.';
  end if;
  if p_custo_unitario is null or p_custo_unitario < 0 then
    raise exception 'Informe o custo (brinde ou amostra entra com 0,00).';
  end if;
  if p_tipo not in ('entrada_nota', 'entrada_manual') then
    raise exception 'Tipo de entrada inválido.';
  end if;

  -- Uma entrada por variação de cada vez: o código gerado do lote e o custo médio não se atropelam.
  select p.controla_validade into v_controla
  from public.variacoes v join public.produtos p on p.id = v.produto_id
  where v.id = p_variacao
  for no key update of v;
  if v_controla is null then
    raise exception 'Variação não encontrada.';
  end if;

  if not v_controla then
    v_lote := public.lote_geral(p_variacao);
  else
    if p_validade is null then
      raise exception 'Informe a validade: este produto controla validade.';
    end if;
    v_codigo := coalesce(v_codigo, public.gerar_codigo_lote(p_variacao, 'ENT'));
    select id, validade into v_lote, v_validade_lote
    from public.lotes where variacao_id = p_variacao and codigo = v_codigo;
    if v_lote is null then
      insert into public.lotes (variacao_id, codigo, validade)
      values (p_variacao, v_codigo, p_validade)
      returning id into v_lote;
    elsif v_validade_lote is distinct from p_validade then
      raise exception 'O lote % já existe com validade %.', v_codigo, to_char(v_validade_lote, 'DD/MM/YYYY');
    end if;
  end if;

  perform public.travar_saldos(array[p_variacao]);
  select coalesce(sum(quantidade), 0) into v_saldo_total from public.saldos where variacao_id = p_variacao;
  select custo_medio into v_custo_medio from public.custos_variacao where variacao_id = p_variacao for update;

  -- R9; sem saldo, ou sem custo médio anterior, vale o custo desta entrada.
  if v_saldo_total = 0 or v_custo_medio is null then
    v_novo_custo := p_custo_unitario;
  else
    v_novo_custo := round(
      (v_saldo_total * v_custo_medio + p_quantidade * p_custo_unitario) / (v_saldo_total + p_quantidade), 6);
  end if;

  v_id := public.movimentar_lote(v_lote, p_tipo, p_quantidade, p_motivo, p_usuario, p_origem, p_origem_id);
  insert into public.movimentacoes_custos (movimentacao_id, custo_unitario) values (v_id, p_custo_unitario);
  insert into public.custos_variacao (variacao_id, custo_medio) values (p_variacao, v_novo_custo)
  on conflict (variacao_id) do update set custo_medio = excluded.custo_medio, atualizado_em = now();
  return v_id;
end;
$$;

revoke execute on function public.entrar_no_estoque(
  uuid, bigint, numeric, date, text, public.tipo_movimentacao, text, uuid, text, text
) from public, anon, authenticated;

-- Entrada manual (sem nota): só o administrador, com custo e motivo obrigatórios.
create function public.registrar_entrada_manual(
  p_variacao uuid,
  p_quantidade bigint,
  p_custo_unitario numeric,
  p_motivo text,
  p_validade date default null,
  p_codigo_lote text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_administrador() then
    raise exception 'Você não tem permissão para acessar esta página.';
  end if;
  if char_length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'Informe o motivo.';
  end if;
  if p_validade < public.hoje_sp() then
    raise exception 'A validade informada já passou.';
  end if;

  return public.entrar_no_estoque(
    p_variacao, p_quantidade, p_custo_unitario, p_validade, p_codigo_lote,
    'entrada_manual', trim(p_motivo), auth.uid());
end;
$$;
