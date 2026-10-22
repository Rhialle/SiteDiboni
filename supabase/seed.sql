-- Dados e funções de apoio usados só no banco local (testes e CI). Nunca vai para a nuvem.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to authenticated, anon;

-- Passa a agir como o usuário informado, com o nível de verificação dado ('aal1' ou 'aal2').
create or replace function tests.entrar_como(usuario uuid, nivel text default 'aal2')
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', usuario, 'role', 'authenticated', 'aal', nivel)::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

-- Volta a agir como o dono do banco, sem login.
create or replace function tests.sair()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);
end;
$$;

grant execute on all functions in schema tests to authenticated, anon;
