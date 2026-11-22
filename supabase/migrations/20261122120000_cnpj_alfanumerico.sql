-- CNPJ alfanumérico (IN RFB 2.229/2024; primeiros CNPJs gerados em julho de 2026).
--
-- As 12 primeiras posições aceitam letras maiúsculas A–Z e números; os 2 dígitos verificadores
-- continuam numéricos. Cada caractere vale o código ASCII − 48 ('0'–'9' valem 0–9, 'A' vale 17)
-- e o cálculo é o módulo 11 de sempre, com os mesmos pesos. Os CNPJs só com números continuam
-- valendo, com os mesmos dígitos verificadores: a regra nova aceita tudo o que a antiga aceitava.
-- Fonte: "Perguntas e respostas: CNPJ alfanumérico" da Receita Federal (pergunta 14).
--
-- Mesma regra de src/lib/validacao/cnpj.ts. Os checks de configuracoes.cnpj_loja e de
-- fornecedores.cnpj chamam esta função, então passam a aceitar o formato novo sem mudar nada neles.
create or replace function public.cnpj_valido(cnpj text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  valores int[];
  pesos1 int[] := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  pesos2 int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma int;
  dv1 int;
  dv2 int;
begin
  if cnpj is null or cnpj !~ '^[0-9A-Z]{12}[0-9]{2}$' or cnpj ~ '^(.)\1{13}$' then
    return false;
  end if;

  valores := array(select ascii(substr(cnpj, i, 1)) - 48 from generate_series(1, 14) as i);

  soma := 0;
  for i in 1..12 loop
    soma := soma + valores[i] * pesos1[i];
  end loop;
  dv1 := case when soma % 11 < 2 then 0 else 11 - soma % 11 end;

  soma := 0;
  for i in 1..13 loop
    soma := soma + valores[i] * pesos2[i];
  end loop;
  dv2 := case when soma % 11 < 2 then 0 else 11 - soma % 11 end;

  return valores[13] = dv1 and valores[14] = dv2;
end;
$$;

-- A chave de acesso da NF-e leva o CNPJ do emitente nas posições 7 a 20, então também pode ter
-- letras ali (Nota Técnica Conjunta DFe 2025.001, item 5): [0-9]{6}[A-Z0-9]{12}[0-9]{26}.
-- Sem isto, a nota de um fornecedor com CNPJ novo seria recusada mesmo com o CNPJ aceito.
alter table public.notas_entrada drop constraint notas_entrada_chave_acesso_check;
alter table public.notas_entrada add constraint notas_entrada_chave_acesso_check
  check (chave_acesso ~ '^[0-9]{6}[0-9A-Z]{12}[0-9]{26}$');
