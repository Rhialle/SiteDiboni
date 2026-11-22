# Cópia de segurança mensal — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** uma rotina no GitHub Actions que, todo mês e por um botão, exporta o banco e os arquivos do Storage, restaura a cópia num Supabase vazio na própria máquina, confere as contagens e guarda o pacote por 90 dias.

**Architecture:** workflow `copia-de-seguranca.yml` com o Supabase CLI (`db dump --linked`, `storage cp -r --linked`); restauração com `psql` num Supabase local criado numa pasta vazia (`supabase init` + `supabase start`); a conferência compara, tabela por tabela, as linhas dos blocos `COPY` do arquivo de dados com `count(*)` no banco restaurado, e o número de arquivos listados no Storage com o de baixados. A lógica de contar e comparar fica num módulo JavaScript puro, com testes unitários.

**Tech Stack:** GitHub Actions (ubuntu-latest, Node 24, Docker), Supabase CLI 2.122, `psql`, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-22-copia-de-seguranca-design.md](../specs/2026-11-22-copia-de-seguranca-design.md)

## Global Constraints

- Agenda: todo dia 1 às 03:00 de São Paulo (`cron: "0 6 1 * *"`, UTC) e `workflow_dispatch`.
- Pacote `copia-AAAA-MM-DD` com `retention-days: 90`.
- Depósitos copiados: `fotos-produtos` e `notas-xml`.
- Origem por enquanto: banco de **teste** (segredos `SUPABASE_ACCESS_TOKEN`, `SUPABASE_REF_TESTE`). A troca para produção (`SUPABASE_ACCESS_TOKEN_PRODUCAO`, `SUPABASE_REF_PRODUCAO`) é um valor no arquivo, documentado no manual.
- A rotina só lê a origem. Nenhuma senha ou chave no repositório. Se faltar um segredo, o usuário cria no painel do GitHub.
- Textos de passos e do resumo da execução em português.
- Ramo `copia-de-seguranca`, saindo do `main`; nada no `main` sem o OK do usuário.
- `workflow_dispatch` só aparece para workflows que já estão no `main`. Para testar no ramo, o workflow também roda em `push` quando o próprio arquivo ou `scripts/copia/**` mudam.

## Review Focus

1. Tabela sem nenhuma linha (ex.: `verificacoes_integridade` vazia): entra na conferência com 0 e não quebra a contagem. Teste unitário na Task 1.
2. Dado com quebra de linha ou barra invertida dentro de um campo (descrição de produto, XML guardado como texto): no formato `COPY` vira `\n` escapado e não conta como linha a mais. Teste unitário na Task 1.
3. Depósito vazio (`notas-xml` sem arquivos no banco de teste): a cópia não falha e a conferência espera 0. Passo na Task 2.
4. Esquemas além do `public` (`auth.users`, `storage.objects`): entram na conferência, porque sem eles ninguém entra no sistema restaurado. Teste unitário na Task 1 e lista na Task 2.
5. Exportação ou restauração com erro no meio: a execução fica vermelha (`ON_ERROR_STOP=1`, `set -euo pipefail`), nunca verde com cópia pela metade. Passo na Task 2 (falha forçada).

---

### Task 1: Contar e comparar

**Files:**
- Create: `scripts/copia/contagem.mjs`, `scripts/copia/contagem.test.mjs`
- Modify: `vitest.config.mts` (incluir `scripts/**/*.test.mjs`)

**Interfaces:**
- Produces:
  - `contarLinhasDoCopy(sql: string): Record<string, number>` — para cada bloco `COPY "esquema"."tabela" (...) FROM stdin;` até a linha `\.`, o número de linhas de dados; chave `esquema.tabela` sem aspas.
  - `compararContagens(esperado: Record<string, number>, obtido: Record<string, number>): string[]` — uma frase em português por diferença (`"public.produtos: na cópia 12, restaurado 11"`, `"public.lotes: não restaurada"`); lista vazia quando tudo bate.

- [ ] **Step 1: Testes unitários** em `contagem.test.mjs`:
  - dois blocos (`public.produtos` com 2 linhas, `auth.users` com 1) → `{ "public.produtos": 2, "auth.users": 1 }`;
  - bloco vazio (`COPY ... FROM stdin;` seguido de `\.`) → a tabela com 0;
  - campo com `\n` escapado e com `\\` → continua contando 1 linha por registro;
  - linhas fora de blocos `COPY` (`SET`, comentários, `SELECT pg_catalog.setval`) não contam;
  - `compararContagens` igual → `[]`; uma tabela com número diferente → a frase com os dois números; uma tabela ausente no obtido → `"… não restaurada"`.
- [ ] **Step 2:** `npm test -- scripts/copia` → falha (módulo inexistente).
- [ ] **Step 3:** Escrever `contagem.mjs` (ESM, sem dependências) e incluir `scripts/**/*.test.mjs` em `vitest.config.mts`.
- [ ] **Step 4:** `npm test`, `npx eslint src e2e scripts` → verdes. Commit "Conta e compara as linhas da cópia de segurança".

### Task 2: A rotina no GitHub

**Files:**
- Create: `.github/workflows/copia-de-seguranca.yml`, `scripts/copia/conferir.mjs`

**Interfaces:**
- Consumes: `contarLinhasDoCopy`, `compararContagens` (Task 1).
- Produces: `node scripts/copia/conferir.mjs <dados.sql> <url-do-banco-restaurado>` — consulta `count(*)` de cada tabela achada no arquivo (via `psql -At`), escreve a tabela de contagens em `$GITHUB_STEP_SUMMARY` e sai com código 1 se houver diferença.

- [ ] **Step 1:** Workflow com `on: schedule` (`0 6 1 * *`), `workflow_dispatch` e `push` com `paths` (o próprio arquivo e `scripts/copia/**`); um job `copia` (ubuntu-latest, `timeout-minutes: 30`), `env` com o token e o ref da origem de teste, `set -euo pipefail` em todo passo:
  1. checkout, Node 24, `npm ci`;
  2. `npx supabase link --project-ref "$REF"`;
  3. `npx supabase db dump --linked --role-only -f copia/roles.sql`, `… -f copia/schema.sql`, `… --data-only --use-copy -f copia/data.sql`;
  4. para cada depósito, `npx supabase storage ls -r --linked --experimental ss:///<depósito>` (guardar a contagem) e `npx supabase storage cp -r --linked --experimental ss:///<depósito> copia/arquivos/<depósito>`; depósito vazio dá 0 e não falha;
  5. numa pasta temporária fora do repositório: `npx supabase init` e `npx supabase start -x studio,imgproxy,realtime,edge-runtime,logflare,vector,supavisor`;
  6. restaurar como na documentação do Supabase: `psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql --dbname <url local>`;
  7. `node scripts/copia/conferir.mjs copia/data.sql <url local>` e a conferência dos arquivos (listados = baixados, por depósito) no resumo;
  8. `actions/upload-artifact` com `name: copia-<data de São Paulo>`, `path: copia/`, `retention-days: 90`, `if-no-files-found: error`.
- [ ] **Step 2:** Escrever `conferir.mjs`.
- [ ] **Step 3:** Commit "Rotina mensal de cópia de segurança com restauração conferida", enviar. Esperado: a execução no ramo termina verde, o resumo mostra as contagens iguais (inclusive `auth.users` e `storage.objects`) e o pacote aparece na execução. Se `db dump --linked` pedir a senha do banco, parar e pedir ao usuário que crie o segredo da senha no painel do GitHub (nunca pelo chat); ledger como Ruling.
- [ ] **Step 4: Falha forçada.** Commit temporário que acrescenta ao esperado uma tabela inexistente (`public.tabela_que_nao_existe: 1`) antes da comparação; enviar; esperado: execução vermelha com a frase "public.tabela_que_nao_existe: não restaurada". Reverter com `git revert` e enviar; esperado: verde de novo.

### Task 3: Manual e README

**Files:**
- Create: `docs/manual/copia-de-seguranca.md`
- Modify: `README.md` (seção Manual), `docs/manual/configuracao-dos-ambientes.md` (lembrete de trocar a origem quando houver produção)
- Create: `docs/superpowers/plans/2026-11-22-copia-de-seguranca-registro.md`

- [ ] **Step 1:** Manual: o que a rotina faz e quando; onde achar a cópia (**Actions** → **Cópia de segurança** → execução → **Artifacts**) e baixar; fazer uma na hora (**Run workflow**); se ficar vermelha (abrir a execução, ver o passo, chamar o Claude); restaurar de verdade num projeto Supabase novo (criar o projeto, os três `psql`, subir os arquivos dos depósitos, apontar a Vercel); o backup diário do Supabase Pro e o que ele não cobre; trocar a origem para a produção.
- [ ] **Step 2:** Registro no formato dos registros 1.x.
- [ ] **Step 3:** Commit "Manual e registro da cópia de segurança", enviar; CI e rotina verdes. Perguntar ao usuário se junta no `main`.
