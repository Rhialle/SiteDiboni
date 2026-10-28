-- Notas de entrada, parte 1: fornecedores, ligações lembradas, notas, itens, lotes e valores.
-- Como no estoque, ninguém grava direto: tudo passa pelas funções das notas. Os valores (custo)
-- só o administrador lê.

create type public.situacao_nota as enum ('em_revisao', 'aguardando_administrador', 'confirmada', 'descartada');

-- ---------------------------------------------------------------------------
-- Fornecedores e ligações (o sistema lembra qual variação é cada item de cada fornecedor)
-- ---------------------------------------------------------------------------

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  cnpj text not null constraint fornecedores_cnpj_key unique check (public.cnpj_valido(cnpj)),
  nome text not null check (char_length(trim(nome)) between 1 and 160),
  criado_em timestamptz not null default now()
);

create table public.fornecedor_itens (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores (id),
  codigo_fornecedor text not null check (char_length(trim(codigo_fornecedor)) between 1 and 60),
  unidade_fornecedor text not null check (char_length(trim(unidade_fornecedor)) between 1 and 20),
  descricao_fornecedor text not null default '',
  codigo_barras text,
  variacao_id uuid not null references public.variacoes (id),
  -- Unidades base por unidade do fornecedor (ex.: 1 CX = 100 un).
  fator bigint not null check (fator > 0),
  atualizado_em timestamptz not null default now(),
  constraint fornecedor_itens_ligacao_key unique (fornecedor_id, codigo_fornecedor, unidade_fornecedor)
);

create trigger tocar_atualizado_em
  before update on public.fornecedor_itens
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Notas, itens, lotes e valores
-- ---------------------------------------------------------------------------

create table public.notas_entrada (
  id uuid primary key default gen_random_uuid(),
  chave_acesso text not null check (chave_acesso ~ '^\d{44}$'),
  fornecedor_id uuid not null references public.fornecedores (id),
  numero text not null,
  serie text not null,
  emitida_em timestamptz not null,
  -- Caminho do XML original no bucket notas-xml.
  caminho_xml text not null,
  situacao public.situacao_nota not null,
  importada_por uuid not null,
  importada_em timestamptz not null default now(),
  confirmada_por uuid,
  confirmada_em timestamptz
);

-- A mesma nota não entra duas vezes; descartada, a chave fica livre para importar de novo.
create unique index notas_entrada_chave_key on public.notas_entrada (chave_acesso) where situacao <> 'descartada';
create index notas_entrada_por_situacao on public.notas_entrada (situacao, importada_em desc);

create table public.notas_entrada_itens (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references public.notas_entrada (id),
  numero_item integer not null check (numero_item > 0),
  codigo_fornecedor text not null,
  descricao text not null,
  codigo_barras text,
  ncm text,
  unidade text not null,
  -- Como está no XML (qCom), na unidade do fornecedor.
  quantidade_nota numeric(15, 4) not null check (quantidade_nota > 0),
  -- Lotes do XML (rastro), como vieram: [{codigo, quantidade (texto, na unidade da nota), validade}].
  rastro jsonb not null default '[]' check (jsonb_typeof(rastro) = 'array'),
  variacao_id uuid references public.variacoes (id),
  fator bigint check (fator > 0),
  quantidade_base_nota bigint check (quantidade_base_nota > 0),
  quantidade_base_recebida bigint check (quantidade_base_recebida >= 0),
  constraint notas_entrada_itens_numero_key unique (nota_id, numero_item)
);

create table public.notas_entrada_item_lotes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.notas_entrada_itens (id) on delete cascade,
  codigo_lote text,
  validade date,
  quantidade_base bigint not null check (quantidade_base > 0)
);

-- Só o administrador lê.
create table public.notas_entrada_itens_valores (
  item_id uuid primary key references public.notas_entrada_itens (id) on delete cascade,
  valor_produto numeric(15, 2) not null default 0,
  desconto numeric(15, 2) not null default 0,
  frete numeric(15, 2) not null default 0,
  seguro numeric(15, 2) not null default 0,
  outras_despesas numeric(15, 2) not null default 0,
  ipi numeric(15, 2) not null default 0,
  icms_st numeric(15, 2) not null default 0,
  custo_total numeric(15, 2) not null,
  -- Reais por unidade base; calculado quando o item é ligado (custo_total ÷ quantidade_base_nota).
  custo_unitario_base numeric(14, 6)
);

-- ---------------------------------------------------------------------------
-- Histórico e permissões
-- ---------------------------------------------------------------------------

create trigger registrar_historico
  after insert or update or delete on public.fornecedores
  for each row execute function public.registrar_historico();

create trigger registrar_historico
  after insert or update or delete on public.fornecedor_itens
  for each row execute function public.registrar_historico();

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'fornecedores', 'fornecedor_itens', 'notas_entrada', 'notas_entrada_itens',
    'notas_entrada_item_lotes', 'notas_entrada_itens_valores'
  ] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on public.%I from anon', tabela);
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', tabela);
  end loop;

  foreach tabela in array array[
    'fornecedores', 'fornecedor_itens', 'notas_entrada', 'notas_entrada_itens', 'notas_entrada_item_lotes'
  ] loop
    execute format(
      'create policy "%1$s: leitura por usuário ativo" on public.%1$I for select to authenticated using (public.eh_usuario_ativo())',
      tabela);
  end loop;
end;
$$;

create policy "notas_entrada_itens_valores: leitura pelo administrador"
  on public.notas_entrada_itens_valores for select to authenticated
  using (public.eh_administrador());

-- ---------------------------------------------------------------------------
-- XML original: bucket privado. Quem importa envia; só o administrador lê (o XML tem os valores);
-- quem enviou pode ler e apagar o próprio arquivo (o app apaga quando a importação falha).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notas-xml', 'notas-xml', false, 4194304, array['text/xml', 'application/xml']);

create policy "notas-xml: envio por usuário ativo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'notas-xml' and public.eh_usuario_ativo());

create policy "notas-xml: leitura pelo administrador ou por quem enviou"
  on storage.objects for select to authenticated
  using (bucket_id = 'notas-xml' and (public.eh_administrador() or owner_id = (select auth.uid())::text));

create policy "notas-xml: quem enviou apaga"
  on storage.objects for delete to authenticated
  using (bucket_id = 'notas-xml' and public.eh_usuario_ativo() and owner_id = (select auth.uid())::text);
