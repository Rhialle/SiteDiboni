-- Fundação: usuários e papéis, configurações da loja e histórico de cadastro.

-- Visitantes sem login (anon) não acessam nenhuma tabela, nem as que vierem depois.
alter default privileges in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------------------

create type public.papel_usuario as enum ('administrador', 'funcionario');

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete restrict,
  nome text not null check (char_length(nome) between 1 and 120),
  email text not null unique,
  papel public.papel_usuario not null default 'funcionario',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Papel de quem está logado, só se estiver ativo.
create function public.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select papel from public.usuarios where id = auth.uid() and ativo
$$;

create function public.eh_usuario_ativo()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.papel_atual() is not null
$$;

-- Administrador só tem poderes depois da verificação em duas etapas (aal2).
create function public.eh_administrador()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    public.papel_atual() = 'administrador' and (auth.jwt() ->> 'aal') = 'aal2',
    false
  )
$$;

-- Cada login criado no Supabase Auth ganha sua linha em usuarios.
-- O primeiro de todos vira administrador; os demais, funcionários.
create function public.ao_criar_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, nome, email, papel)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    case
      when exists (select 1 from public.usuarios) then 'funcionario'
      else 'administrador'
    end::public.papel_usuario
  );
  return new;
end;
$$;

create trigger ao_criar_usuario_auth
  after insert on auth.users
  for each row execute function public.ao_criar_usuario_auth();

create function public.proteger_ultimo_administrador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.papel = 'administrador' and old.ativo
     and not (new.papel = 'administrador' and new.ativo)
     and not exists (
       select 1 from public.usuarios
       where id <> old.id and papel = 'administrador' and ativo
     )
  then
    raise exception 'Precisa existir pelo menos um administrador ativo.';
  end if;
  return new;
end;
$$;

create trigger proteger_ultimo_administrador
  before update on public.usuarios
  for each row execute function public.proteger_ultimo_administrador();

-- ---------------------------------------------------------------------------
-- Configurações da loja (uma linha só)
-- ---------------------------------------------------------------------------

create function public.cnpj_valido(cnpj text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  digitos int[];
  pesos1 int[] := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  pesos2 int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma int;
  dv1 int;
  dv2 int;
begin
  if cnpj is null or cnpj !~ '^\d{14}$' or cnpj ~ '^(\d)\1{13}$' then
    return false;
  end if;

  digitos := array(select substr(cnpj, i, 1)::int from generate_series(1, 14) as i);

  soma := 0;
  for i in 1..12 loop
    soma := soma + digitos[i] * pesos1[i];
  end loop;
  dv1 := case when soma % 11 < 2 then 0 else 11 - soma % 11 end;

  soma := 0;
  for i in 1..13 loop
    soma := soma + digitos[i] * pesos2[i];
  end loop;
  dv2 := case when soma % 11 < 2 then 0 else 11 - soma % 11 end;

  return digitos[13] = dv1 and digitos[14] = dv2;
end;
$$;

create table public.configuracoes (
  id smallint primary key default 1 check (id = 1),
  cnpj_loja text check (cnpj_loja is null or public.cnpj_valido(cnpj_loja)),
  limite_ajuste_centavos integer not null default 5000 check (limite_ajuste_centavos >= 0),
  dias_alerta_validade integer[] not null default '{30,15,7}'
    check (array_length(dias_alerta_validade, 1) >= 1 and 0 < all (dias_alerta_validade)),
  atualizado_em timestamptz not null default now()
);

insert into public.configuracoes default values;

-- ---------------------------------------------------------------------------
-- Histórico de cadastro: quem mudou o quê, com valor antigo e novo
-- ---------------------------------------------------------------------------

create table public.historico_cadastro (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text,
  campo text not null,
  valor_antigo text,
  valor_novo text,
  usuario_id uuid,
  em timestamptz not null default now()
);

-- Ligado como gatilho AFTER INSERT OR UPDATE OR DELETE nas tabelas de cadastro.
create function public.registrar_historico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antigo jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  novo jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  registro text := coalesce(novo, antigo) ->> 'id';
  chave text;
begin
  if tg_op = 'UPDATE' then
    for chave in select jsonb_object_keys(novo) loop
      if chave <> 'atualizado_em' and (antigo -> chave) is distinct from (novo -> chave) then
        insert into public.historico_cadastro
          (tabela, registro_id, campo, valor_antigo, valor_novo, usuario_id)
        values
          (tg_table_name, registro, chave, antigo ->> chave, novo ->> chave, auth.uid());
      end if;
    end loop;
  elsif tg_op = 'INSERT' then
    insert into public.historico_cadastro (tabela, registro_id, campo, valor_novo, usuario_id)
    values (tg_table_name, registro, '*criado*', novo::text, auth.uid());
  else
    insert into public.historico_cadastro (tabela, registro_id, campo, valor_antigo, usuario_id)
    values (tg_table_name, registro, '*apagado*', antigo::text, auth.uid());
  end if;
  return null;
end;
$$;

create trigger registrar_historico
  after insert or update or delete on public.usuarios
  for each row execute function public.registrar_historico();

-- Ligado depois de inserir a linha 1, para ela não aparecer como "*criado*".
create trigger registrar_historico
  after insert or update or delete on public.configuracoes
  for each row execute function public.registrar_historico();

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------

alter table public.usuarios enable row level security;
alter table public.configuracoes enable row level security;
alter table public.historico_cadastro enable row level security;

create policy "usuarios: leitura por usuário ativo"
  on public.usuarios for select to authenticated
  using (public.eh_usuario_ativo());

create policy "usuarios: alteração pelo administrador"
  on public.usuarios for update to authenticated
  using (public.eh_administrador())
  with check (public.eh_administrador());

create policy "configuracoes: leitura por usuário ativo"
  on public.configuracoes for select to authenticated
  using (public.eh_usuario_ativo());

create policy "configuracoes: alteração pelo administrador"
  on public.configuracoes for update to authenticated
  using (public.eh_administrador())
  with check (public.eh_administrador());

create policy "historico_cadastro: leitura pelo administrador"
  on public.historico_cadastro for select to authenticated
  using (public.eh_administrador());

-- Linhas de usuários só nascem pelo gatilho; ninguém apaga usuários nem configurações.
revoke insert, delete on public.usuarios from authenticated;
revoke insert, delete on public.configuracoes from authenticated;
-- O histórico só é escrito pelo gatilho.
revoke insert, update, delete on public.historico_cadastro from authenticated;
revoke all on all tables in schema public from anon;
