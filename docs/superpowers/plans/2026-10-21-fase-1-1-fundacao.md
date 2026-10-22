# Fase 1.1: Fundação (Plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** ter o esqueleto do sistema no GitHub, publicado na Vercel e ligado ao Supabase, com login, verificação em duas etapas para o administrador, gestão de usuários e a tela de configurações, tudo coberto por testes automáticos.

**Arquitetura:** um único app Next.js (App Router) na Vercel, com Supabase para banco, login e e-mail. As regras de acesso ficam no banco (Row Level Security mais funções). O app só chama o banco com o login de quem está usando, exceto o convite e o bloqueio de login, que usam a chave secreta no servidor. Os ambientes são três: local (Docker), teste (Supabase gratuito, usado pelas pré-visualizações da Vercel) e produção.

**Tecnologia:** Next.js e TypeScript (última versão estável na hora da execução), Tailwind CSS, shadcn/ui, `@supabase/ssr`, `@supabase/supabase-js`, CLI do Supabase (`supabase` como dependência de desenvolvimento, chamado com `npx`), Vitest, pgTAP, Playwright, `otpauth` (só nos testes) e GitHub Actions.

**Especificação:** [docs/superpowers/specs/2026-10-21-fase-1-base-design.md](../specs/2026-10-21-fase-1-base-design.md). Este plano cobre as seções 4, 6.4, 8 (acesso, desativação, último administrador), 10.1, 10.10 e parte da 11 e da 12.

## Sequência da fase 1

Este é o plano 1.1. Cada plano seguinte é escrito e aprovado só depois do anterior estar pronto.

| Plano | Entrega |
|---|---|
| **1.1 Fundação** | Repositório, Vercel, Supabase, CI, login, duas etapas, usuários, configurações |
| 1.2 Catálogo | Produtos, variações, formas de venda, faixas, categorias, etiquetas, fotos, compatibilidades, grade, edição em massa |
| 1.3 Motor do estoque | Lotes, saldos, movimentações, R1 a R10, entrada manual, perdas, solicitações, estorno, extrato, alertas, conferência diária |
| 1.4 Notas de entrada | Importação de XML, ligação com fornecedor, revisão, confirmação, divergências |
| 1.5 Planilhas | Modelo, importação, exportação |
| 1.6 Inventário e entrega | Inventário, manual completo, critérios de pronto da seção 2 da especificação |

## Mudança durante a execução (2026-10-21): sem Docker no computador

O computador de desenvolvimento tem 8 GB de memória, e o usuário escolheu não usar o Docker. A partir da Task 2, o plano muda assim:

- **Testes do banco (pgTAP) e de tela (Playwright):** rodam só no GitHub Actions, que tem Docker. No computador rodam apenas `npm test`, `lint`, `typecheck` e `build`.
- **CI antecipado:** o `ci.yml`, com o job `testes`, sai da Task 6 e é criado no fim da Task 2. Cada passo "rodar e ver falhar/passar" das Tasks 3 a 5 vira: enviar o branch e ler o resultado com `gh run watch`/`gh run view --log-failed`.
- **Configuração local:**
  - O computador usa o projeto `loja-teste` na nuvem. O `.env.local` (fora do git) recebe a URL e a chave publicável.
  - A chave secreta, só se for necessária, é colada pelo próprio usuário.
- **Tipos do banco:** `npm run db:tipos` passa a usar `supabase gen types typescript --linked`. Antes disso, o usuário faz `supabase login` e o executor faz `supabase link --project-ref <loja-teste>`, sem senha do banco.
- **Ferramenta nova:** instalar a GitHub CLI (`gh`). O usuário faz `gh auth login` uma vez, para o executor ler os resultados do CI.
- **Supabase local:** o `npm run db:iniciar` e o `npm run env:local` continuam existindo, mas só o CI usa.

## Restrições globais

- A interface é em português do Brasil, com moeda em R$, datas no formato dd/mm/aaaa e fuso `America/Sao_Paulo`.
- Tabelas, colunas e funções do banco têm nomes em português, em `snake_case` e sem acento. Funções e arquivos do app também usam nomes em português; o que é do próprio framework fica como o framework exige.
- Valores em dinheiro são guardados em centavos inteiros.
- **Row Level Security ligada em toda tabela.** O papel `anon` não lê nem grava nada.
- Tudo o que o administrador pode fazer exige `aal2` (duas etapas verificadas), checado no banco por `eh_administrador()`.
- **Regiões:** Supabase em `sa-east-1` (São Paulo) e funções da Vercel em `gru1` (São Paulo).
- **Senhas e chaves:**
  - Nenhum segredo vai para o repositório. Só `.env.example`, sem valores.
  - Senhas e chaves dos ambientes de nuvem são digitadas pelo usuário nos painéis da Vercel, do Supabase e do GitHub. Quem executa o plano nunca recebe esses valores.
- **Commits:** nunca usar `git add -A` nem `git add .`. Sempre adicionar caminhos explícitos. O arquivo `SKILL (1).md` da raiz não entra no repositório.
- **Branches:**
  - O trabalho acontece num branch `fase-1-1-fundacao`.
  - O `main` só recebe o branch quando o CI estiver verde e o usuário aprovar a pré-visualização.
  - O repositório é privado no plano gratuito do GitHub, que não tem regra de proteção de branch. Por isso essa regra é cumprida pelo processo, documentado no manual.

## Textos fixos da interface

| Situação | Texto |
|---|---|
| Login errado | `E-mail ou senha incorretos.` |
| Usuário desativado | `Este usuário está desativado. Fale com o administrador.` |
| Link inválido ou expirado | `Este link expirou ou já foi usado. Peça um novo ao administrador.` |
| Sem permissão | `Você não tem permissão para acessar esta página.` |
| Último administrador | `Precisa existir pelo menos um administrador ativo.` |
| E-mail repetido no convite | `Já existe um usuário com este e-mail.` |
| Convite enviado | `Convite enviado para {email}.` |
| CNPJ inválido | `CNPJ inválido.` |
| Código de duas etapas errado | `Código incorreto. Confira o aplicativo e tente de novo.` |
| Senha curta | `A senha precisa ter pelo menos 8 caracteres.` |
| Recuperação pedida | `Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.` |

## Passos que dependem do usuário

Quem executa o plano para e espera em cada um destes passos, explicando o que fazer em linguagem simples:

- **U1.** Informar o endereço do repositório do GitHub. Ele precisa ser privado e estar vazio. O primeiro `git push` abre o navegador para o login no GitHub (Git Credential Manager).
- **U2.** Instalar o WSL2 e o Docker Desktop no Windows, depois reiniciar o computador. Sem isso não dá para rodar o Supabase local nem os testes do banco.
- **U3.** Na Vercel: Add New, depois Project, importar o repositório, framework Next.js, Deploy. Depois, informar o endereço de produção (`https://<projeto>.vercel.app`).
- **U4.** No Supabase:
  - criar a organização "Loja (teste)" no plano Free, com o projeto `loja-teste`;
  - criar a organização "Loja", com o projeto `loja-producao`;
  - os dois projetos na região South America (São Paulo);
  - guardar as senhas do banco num gerenciador de senhas;
  - informar o *Project ref* de cada projeto (não é segredo).
- **U5.** Configurar os ambientes:
  - Na Vercel, em Settings e depois Environment Variables, cadastrar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`. Em Preview e Development, os valores do `loja-teste`. Em Production, os do `loja-producao`.
  - Em cada projeto do Supabase, ir em Authentication:
    - desligar "Allow new users to sign up";
    - ligar TOTP em Multi-Factor;
    - definir a senha mínima em 8 caracteres;
    - em URL Configuration, preencher Site URL (produção: endereço de produção; teste: endereço de produção também) e Redirect URLs (`<endereço>/auth/confirmar`, e no teste também `https://*-<time>.vercel.app/**`).
- **U6.** No GitHub, em Settings, Secrets and variables e depois Actions, criar estes segredos:
  - `SUPABASE_ACCESS_TOKEN` (gerado em supabase.com/dashboard/account/tokens);
  - `SUPABASE_REF_TESTE`;
  - `SUPABASE_SENHA_BANCO_TESTE`;
  - `SUPABASE_REF_PRODUCAO`;
  - `SUPABASE_SENHA_BANCO_PRODUCAO`.
- **U7.** Em cada projeto do Supabase, ir em Authentication, Users, Add user, Create new user, e criar o próprio usuário. O primeiro usuário de cada banco vira administrador automaticamente.

## Pontos de atenção na revisão

Cinco situações que a especificação implica e que são as mais prováveis de causar problema para quem usa. Cada uma tem um teste na tarefa indicada.

1. **Usuário desativado com a sessão aberta:** na próxima página que ele abrir, cai em `/entrar` com a mensagem de desativado, e o banco não devolve nada a ele (Tarefa 5).
2. **Link de convite ou de recuperação expirado ou já usado:** mostra a mensagem de link inválido, não uma tela de erro (Tarefa 4).
3. **E-mail com maiúsculas ou espaços no convite:** é normalizado, e a repetição é detectada sem diferenciar maiúsculas (Tarefa 5).
4. **CNPJ digitado com pontos e barra:** é aceito e guardado só com os dígitos (Tarefa 5).
5. **Administrador tentando se rebaixar ou se desativar sendo o único:** a mensagem do último administrador aparece na tela e nada muda (Tarefa 5).

---

### Task 1: Esqueleto do app, primeiro envio ao GitHub e primeira publicação

**Arquivos:**
- Criar: arquivos gerados pelo `create-next-app` e `shadcn init`, `vercel.json`, `vitest.config.ts`, `src/lib/formatacao.ts`, `src/lib/formatacao.test.ts`, `src/app/page.tsx` (substituir), `.env.example`
- Modificar: `.git/info/exclude` (adicionar `SKILL (1).md`), `README.md` (não sobrescrever; o `create-next-app` não pode tocar nele)

**Interfaces:**
- Produz:
  - `formatarMoeda(centavos: number): string`
  - `formatarData(valor: Date | string): string`
  - `reaisParaCentavos(texto: string): number` (lança `Error('Valor inválido')`)
  - os scripts `npm run lint`, `typecheck` e `test`

- [ ] **Passo 1:** criar o branch `fase-1-1-fundacao` e adicionar `SKILL (1).md` a `.git/info/exclude`.
- [ ] **Passo 2:** gerar o app numa pasta temporária do scratchpad com `npx create-next-app@latest app --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes` e mover o conteúdo para a raiz sem trocar o `README.md`. Depois, `npx shadcn@latest init` com as opções padrão. Anotar no commit as versões do Next e do React que foram instaladas.
- [ ] **Passo 3:** configurar a qualidade do código.
  - Criar os scripts `"lint": "eslint ."`, `"typecheck": "tsc --noEmit"` e `"test": "vitest run"`.
  - Instalar `vitest`, `@vitejs/plugin-react` e `vite-tsconfig-paths` como dependências de desenvolvimento.
  - No `vitest.config.ts`, rodar só os arquivos `src/**/*.test.ts`.
  - Criar o `vercel.json` com `{"regions":["gru1"]}`.
- [ ] **Passo 4: escrever o teste que falha**, em `src/lib/formatacao.test.ts`:

```ts
expect(formatarMoeda(123456)).toBe('R$ 1.234,56')
expect(formatarMoeda(5)).toBe('R$ 0,05')
expect(formatarData('2026-10-21T02:30:00Z')).toBe('20/10/2026') // fuso de São Paulo
expect(reaisParaCentavos('50,00')).toBe(5000)
expect(reaisParaCentavos('R$ 1.234,5')).toBe(123450)
expect(() => reaisParaCentavos('abc')).toThrow('Valor inválido')
expect(() => reaisParaCentavos('-1,00')).toThrow('Valor inválido')
```

- [ ] **Passo 5:** rodar `npm test` e confirmar que FALHA (o módulo ainda não existe).
- [ ] **Passo 6:** implementar `src/lib/formatacao.ts` com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` e `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`.
- [ ] **Passo 7:** rodar `npm test && npm run lint && npm run typecheck && npm run build` e confirmar que tudo passa.
- [ ] **Passo 8:** criar a página inicial e as variáveis de exemplo.
  - `src/app/page.tsx` faz `redirect('/entrar')`.
  - `src/app/entrar/page.tsx` mostra por enquanto só o título "Entrar".
  - `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` e `SUPABASE_SECRET_KEY=`.
- [ ] **Passo 9:** fazer o commit com caminhos explícitos e a mensagem `Cria o esqueleto do app Next.js`.
- [ ] **Passo 10 (U1):** `git remote add origin <url>`, depois `git push -u origin main` e `git push -u origin fase-1-1-fundacao`.
- [ ] **Passo 11 (U3):** o usuário importa o repositório na Vercel.
  - Avisar antes que a primeira publicação de produção vai falhar, e que isso é esperado: o `main` ainda só tem documentos e só recebe o app no fim deste plano.
  - Conferir no navegador que o endereço de pré-visualização do branch `fase-1-1-fundacao` mostra "Entrar".

### Task 2: Supabase no projeto (local, clientes e sessão)

**Arquivos:**
- Criar: `supabase/config.toml` (via `npx supabase init`), `supabase/seed.sql`, `scripts/gerar-env-local.mjs`, `src/lib/supabase/servidor.ts`, `src/lib/supabase/navegador.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/sessao-proxy.ts`, `src/proxy.ts` (no Next 16 ou superior; em versão anterior, `src/middleware.ts`)
- Modificar: `package.json`, `.gitignore` (garantir `.env*.local` e `supabase/.temp`)

**Interfaces:**
- Produz:
  - `criarClienteServidor(): Promise<SupabaseClient<Database>>`
  - `criarClienteNavegador(): SupabaseClient<Database>`
  - `criarClienteAdmin(): SupabaseClient<Database>` (com `import 'server-only'`, usa `SUPABASE_SECRET_KEY`)
  - `atualizarSessao(req: NextRequest): Promise<NextResponse>`
  - os scripts `npm run db:iniciar`, `db:tipos` e `env:local`

- [ ] **Passo 1 (U2):** confirmar que `docker --version` responde.
- [ ] **Passo 2:** instalar `npm i -D supabase` e `npm i @supabase/supabase-js @supabase/ssr server-only`, depois rodar `npx supabase init`.
- [ ] **Passo 3:** no `config.toml`, configurar:

  ```toml
  [auth]
  enable_signup = false
  site_url = "http://localhost:3000"
  additional_redirect_urls = ["http://localhost:3000/auth/confirmar"]
  minimum_password_length = 8

  [auth.mfa.totp]
  enroll_enabled = true
  verify_enabled = true
  ```

- [ ] **Passo 4:** criar o script `scripts/gerar-env-local.mjs`.
  - Lê `npx supabase status -o json`.
  - Grava `.env.local` com a URL da API, a chave publicável e a chave secreta. Aceita os nomes novos (`PUBLISHABLE_KEY`/`SECRET_KEY`) e os antigos (`ANON_KEY`/`SERVICE_ROLE_KEY`).
  - Scripts: `"db:iniciar": "supabase start"`, `"env:local": "node scripts/gerar-env-local.mjs"` e `"db:tipos": "supabase gen types typescript --local > src/lib/supabase/tipos.ts"`.
- [ ] **Passo 5:** implementar os três clientes e o proxy de sessão seguindo o guia oficial do `@supabase/ssr` para o App Router. O proxy renova a sessão em toda requisição, exceto `_next/static`, `_next/image` e arquivos de imagem.
- [ ] **Passo 6:** rodar `npm run db:iniciar && npm run env:local && npm run db:tipos && npm run build` e confirmar que tudo passa.
- [ ] **Passo 7:** commit com `Liga o projeto ao Supabase`.

### Task 3: Banco (usuários, papéis, configurações e histórico)

**Arquivos:**
- Criar: `supabase/migrations/<timestamp>_fundacao.sql`, `supabase/tests/database/01_usuarios.test.sql`, `supabase/tests/database/02_configuracoes.test.sql`, `supabase/tests/database/03_historico.test.sql`
- Modificar: `supabase/seed.sql` (só ajuda para testes locais), `src/lib/supabase/tipos.ts` (gerado)

**Interfaces:**
- Produz:
  - `enum papel_usuario ('administrador','funcionario')`
  - tabela `usuarios(id uuid pk → auth.users, nome text, email text unique, papel papel_usuario, ativo boolean, criado_em timestamptz)`
  - tabela `configuracoes(id smallint = 1, cnpj_loja text null, limite_ajuste_centavos integer default 5000, dias_alerta_validade integer[] default '{30,15,7}')`
  - tabela `historico_cadastro(id bigint identity, tabela text, registro_id text, campo text, valor_antigo text, valor_novo text, usuario_id uuid, em timestamptz)`
  - funções `papel_atual(): papel_usuario`, `eh_usuario_ativo(): boolean`, `eh_administrador(): boolean`, `cnpj_valido(text): boolean`
  - função de gatilho `registrar_historico()` (os planos 1.2 a 1.5 vão ligá-la às suas tabelas)

- [ ] **Passo 1:** no `seed.sql`, criar o schema `tests` com estas funções, usadas só nos testes locais e no CI:
  - `tests.entrar_como(usuario uuid, nivel text default 'aal2')`: `set local role authenticated` e `request.jwt.claims` com `sub`, `role` e `aal`;
  - `tests.sair()`;

  Executáveis por `authenticated`. Também ativar `create extension if not exists pgtap`.
- [ ] **Passo 2: escrever os testes que falham.**

`01_usuarios.test.sql`, que insere em `auth.users` a dona (`…0a`, `{"nome":"Dona"}`) e depois a funcionária (`…0b`):

```sql
select is((select papel::text from usuarios where id = '…0a'), 'administrador', 'primeiro usuário vira administrador');
select is((select papel::text from usuarios where id = '…0b'), 'funcionario', 'demais viram funcionário');
select is((select nome from usuarios where id = '…0a'), 'Dona', 'nome vem dos metadados');
select tests.entrar_como('…0a', 'aal1');
select ok(not eh_administrador(), 'sem duas etapas não é administrador');
select tests.entrar_como('…0a', 'aal2');
select ok(eh_administrador(), 'com duas etapas é administrador');
select throws_ok($$update usuarios set ativo = false where id = '…0a'$$, 'P0001', 'Precisa existir pelo menos um administrador ativo.');
select throws_ok($$update usuarios set papel = 'funcionario' where id = '…0a'$$, 'P0001', 'Precisa existir pelo menos um administrador ativo.');
select tests.entrar_como('…0b');
update usuarios set nome = 'Invasora' where id = '…0a';
select tests.sair();
select is((select nome from usuarios where id = '…0a'), 'Dona', 'funcionário não altera usuários');
update usuarios set ativo = false where id = '…0b';
select tests.entrar_como('…0b');
select is((select count(*) from usuarios), 0::bigint, 'usuário inativo não lê nada');
select tests.sair();
set local role anon;
select throws_ok($$select count(*) from usuarios$$, '42501', null, 'anônimo não tem permissão');
```

`02_configuracoes.test.sql`:

```sql
select is((select limite_ajuste_centavos from configuracoes), 5000);
select is((select dias_alerta_validade from configuracoes), '{30,15,7}'::int[]);
select ok(cnpj_valido('11222333000181'));
select ok(not cnpj_valido('11222333000182'));
select ok(not cnpj_valido('00000000000000'));
select throws_ok($$update configuracoes set cnpj_loja = '11222333000182'$$, '23514'); -- check_violation
-- como funcionário (aal1): update no limite não altera a linha; como administrador (aal2): altera
select throws_ok($$insert into configuracoes (id) values (2)$$, '23514');
```

`03_historico.test.sql`: o administrador muda o limite de 5000 para 8000.

```sql
select results_eq($$select campo, valor_antigo, valor_novo, usuario_id::text from historico_cadastro where tabela = 'configuracoes'$$,
                  $$values ('limite_ajuste_centavos', '5000', '8000', '…0a')$$);
-- como funcionário: count(*) de historico_cadastro = 0
-- como administrador: insert/delete direto em historico_cadastro lança 42501 (sem permissão)
```

- [ ] **Passo 3:** rodar `npx supabase db reset && npx supabase test db` e confirmar que FALHA.
- [ ] **Passo 4:** escrever a migração `fundacao.sql`.
  - **Gatilho `ao_criar_usuario_auth`**, depois de inserir em `auth.users`, com `security definer`: cria a linha em `usuarios`.
    - O nome vem de `raw_user_meta_data->>'nome'`; se não houver, a parte do e-mail antes do `@`.
    - O papel é `administrador` se a tabela estiver vazia e `funcionario` nos demais casos.
  - **Gatilho `proteger_ultimo_administrador`**, antes de atualizar `usuarios`: quando a linha antiga é administrador ativo e a nova deixa de ser, e não existe outro administrador ativo, lança `raise exception 'Precisa existir pelo menos um administrador ativo.'`.
  - **`papel_atual()`**: `stable security definer`. Devolve o papel de `auth.uid()` só se o usuário estiver ativo.
  - **`eh_administrador()`**: `papel_atual() = 'administrador' and auth.jwt()->>'aal' = 'aal2'`.
  - **`cnpj_valido(text)`**: `immutable`. Exige 14 dígitos, recusa todos os dígitos iguais e confere os dois dígitos verificadores (pesos 5…2 e 9…2; depois 6…2 e 9…2).
  - **`configuracoes`**:
    - `check (id = 1)`, `check (cnpj_loja is null or cnpj_valido(cnpj_loja))`, `check (limite_ajuste_centavos >= 0)` e `check (array_length(dias_alerta_validade, 1) >= 1 and 0 < all(dias_alerta_validade))`;
    - inserir a linha 1.
  - **`registrar_historico()`**: `security definer`.
    - Em UPDATE, grava uma linha por coluna alterada, comparando `to_jsonb(old)` com `to_jsonb(new)` e ignorando `atualizado_em`.
    - Em INSERT e DELETE, grava uma linha com `campo = '*criado*'` ou `'*apagado*'` e o registro inteiro em JSON.
    - `usuario_id = auth.uid()`.
    - Ligar a `usuarios` e a `configuracoes`. Em `configuracoes`, ligar o gatilho só depois de inserir a linha 1, para não gerar um registro `*criado*` que quebraria o teste do histórico.
  - **RLS:**
    - `usuarios`: leitura por `eh_usuario_ativo()`; atualização por `eh_administrador()`.
    - `configuracoes`: leitura por `eh_usuario_ativo()`; atualização por `eh_administrador()`.
    - `historico_cadastro`: leitura por `eh_administrador()`.
    - `revoke insert, update, delete on historico_cadastro from authenticated, anon`; `revoke all on all tables in schema public from anon`.
- [ ] **Passo 5:** rodar `npx supabase db reset && npx supabase test db` e confirmar que todos passam.
- [ ] **Passo 6:** rodar `npm run db:tipos && npm run typecheck`.
- [ ] **Passo 7:** commit com `Cria usuários, papéis, configurações e histórico no banco`.

### Task 4: Login, duas etapas e proteção das páginas

**Arquivos:**
- Criar:
  - `src/lib/auth/sessao.ts`
  - `src/app/entrar/page.tsx`, `src/app/entrar/acoes.ts`
  - `src/app/entrar/duas-etapas/page.tsx`, `src/app/entrar/duas-etapas/acoes.ts`
  - `src/app/recuperar-senha/page.tsx`, `src/app/redefinir-senha/page.tsx`
  - `src/app/auth/confirmar/route.ts`
  - `src/app/sem-permissao/page.tsx`
  - `src/app/(painel)/layout.tsx`, `src/app/(painel)/inicio/page.tsx`
  - `playwright.config.ts`, `e2e/apoio/supabase.ts`, `e2e/entrar.spec.ts`
- Modificar: `package.json` (`"test:e2e": "playwright test"`)

**Interfaces:**
- Consome: os clientes da Tarefa 2; `usuarios` e `eh_administrador()` da Tarefa 3.
- Produz:
  - `type Papel = 'administrador' | 'funcionario'`
  - `type UsuarioSessao = { id: string; nome: string; email: string; papel: Papel; nivel: 'aal1' | 'aal2' }`
  - `obterUsuarioSessao(): Promise<UsuarioSessao | null>`: devolve `null` sem sessão ou com usuário inativo
  - `exigirUsuario(): Promise<UsuarioSessao>`: sem sessão, redireciona para `/entrar`; inativo, para `/entrar?motivo=desativado`
  - `exigirAdministrador(): Promise<UsuarioSessao>`: administrador com `aal1` vai para `/entrar/duas-etapas`; funcionário vai para `/sem-permissao`
  - funções de apoio nos testes (`e2e/apoio/supabase.ts`):
    - `criarUsuarioTeste(dados: { email: string; senha: string; nome: string; papel: Papel }): Promise<string>`
    - `limparUsuarios(): Promise<void>`
    - `ultimoLinkPorEmail(para: string): Promise<string>`, que busca no capturador de e-mails do Supabase local (endereço em `npx supabase status`, Mailpit na porta 54324)

- [ ] **Passo 1: escrever os testes que falham**, em `e2e/entrar.spec.ts`. Antes de cada teste, `limparUsuarios()`, depois criar o administrador e a funcionária.

```ts
test('sem sessão, /inicio leva para /entrar')            // expect(page).toHaveURL(/\/entrar/)
test('senha errada mostra a mensagem')                     // getByText('E-mail ou senha incorretos.')
test('funcionária entra e vê o Início com o nome')        // getByRole('heading', { name: 'Início' }); getByText('Func')
test('administrador cadastra as duas etapas e entra')     // lê o segredo exibido na tela, gera o código com new TOTP({ secret }).generate(), chega ao Início
test('código de duas etapas errado mostra a mensagem')    // getByText('Código incorreto. Confira o aplicativo e tente de novo.')
test('recuperar senha: e-mail, link, nova senha, entrar') // getByText('Se o e-mail estiver cadastrado, …'); ultimoLinkPorEmail; nova senha 'NovaSenha123'; login funciona
test('link inválido mostra a mensagem')                   // /auth/confirmar?token_hash=xxx&type=recovery → getByText('Este link expirou ou já foi usado. Peça um novo ao administrador.')
test('senha nova curta mostra a mensagem')                // 'curta' → getByText('A senha precisa ter pelo menos 8 caracteres.')
```

- [ ] **Passo 2:** configurar o Playwright.
  - Instalar `@playwright/test` e `otpauth` como dependências de desenvolvimento e rodar `npx playwright install chromium`.
  - O `webServer` do `playwright.config.ts` roda `npm run build && npm run start` na porta 3000, com o ambiente do `.env.local`.
  - Rodar `npm run test:e2e` e confirmar que FALHA.
- [ ] **Passo 3:** implementar `src/lib/auth/sessao.ts`.
  - O nível de verificação vem de `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
  - O usuário vem de `usuarios` pelo `auth.getUser()`.
- [ ] **Passo 4:** implementar as páginas e ações.
  - **Login:** `signInWithPassword`. Qualquer erro de credencial mostra "E-mail ou senha incorretos."; erro de usuário banido mostra a mensagem de desativado.
  - **Duas etapas:** se não houver fator, `mfa.enroll({ factorType: 'totp' })` e mostrar o QR e o segredo em texto. Se houver, `mfa.challengeAndVerify`.
  - **Rota `/auth/confirmar`:** `verifyOtp({ token_hash, type })`. Se der certo, segue para `next` ou `/redefinir-senha`. Se falhar, mostra a mensagem de link inválido.
  - **Painel:** o `(painel)/layout.tsx` chama `exigirUsuario()`, mostra o menu com Início e Sair, e para o administrador também Usuários e Configurações. Administrador com `aal1` é redirecionado para as duas etapas.
- [ ] **Passo 5:** rodar `npm run test:e2e && npm test && npm run lint && npm run typecheck` e confirmar que tudo passa.
- [ ] **Passo 6:** commit com `Adiciona login, duas etapas e recuperação de senha`.

### Task 5: Usuários e configurações (telas do administrador)

**Arquivos:**
- Criar:
  - `src/lib/validacao/cnpj.ts`, `src/lib/validacao/cnpj.test.ts`
  - `src/lib/validacao/email.ts`, `src/lib/validacao/email.test.ts`
  - `src/app/(painel)/usuarios/page.tsx`, `src/app/(painel)/usuarios/acoes.ts`
  - `src/app/(painel)/configuracoes/page.tsx`, `src/app/(painel)/configuracoes/acoes.ts`
  - `e2e/usuarios.spec.ts`, `e2e/configuracoes.spec.ts`

**Interfaces:**
- Consome: `exigirAdministrador()`, `criarClienteServidor()`, `criarClienteAdmin()`, `reaisParaCentavos()` e `formatarMoeda()`.
- Produz:
  - `normalizarCnpj(texto: string): string`
  - `cnpjValido(texto: string): boolean`
  - `formatarCnpj(cnpj: string): string`
  - `normalizarEmail(texto: string): string`
  - as ações `convidarUsuario(estado, formData)`, `alterarPapel(id: string, papel: Papel)`, `alterarSituacao(id: string, ativo: boolean)` e `salvarConfiguracoes(estado, formData)`

- [ ] **Passo 1: escrever os testes unitários que falham.**

```ts
expect(cnpjValido('11.222.333/0001-81')).toBe(true)
expect(cnpjValido('11222333000182')).toBe(false)
expect(cnpjValido('00000000000000')).toBe(false)
expect(normalizarCnpj(' 11.222.333/0001-81 ')).toBe('11222333000181')
expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81')
expect(normalizarEmail('  Maria@Loja.COM ')).toBe('maria@loja.com')
```

- [ ] **Passo 2: escrever os testes de tela que falham.**

```ts
// usuarios.spec.ts
test('administrador convida funcionária, que define a senha e entra sem ver Usuários')
test('convite com e-mail repetido (com maiúsculas) mostra a mensagem')     // 'Já existe um usuário com este e-mail.'
test('único administrador não consegue se desativar nem se rebaixar')      // 'Precisa existir pelo menos um administrador ativo.'; o papel continua administrador
test('funcionária desativada com a sessão aberta cai no /entrar')          // recarrega /inicio → /entrar e 'Este usuário está desativado. Fale com o administrador.'
test('funcionária desativada não consegue entrar de novo')
test('funcionária que abre /usuarios vê a página sem permissão')           // 'Você não tem permissão para acessar esta página.'
// configuracoes.spec.ts
test('CNPJ com máscara é salvo e reaparece formatado')                     // '11.222.333/0001-81'
test('CNPJ inválido mostra a mensagem e não salva')                        // 'CNPJ inválido.'
test('limite de ajuste em reais é salvo em centavos')                      // digita '80,00' → reaparece 'R$ 80,00'
```

- [ ] **Passo 3:** rodar `npm test && npm run test:e2e` e confirmar que os testes novos FALHAM.
- [ ] **Passo 4:** implementar as validações e as telas.
  - **Convite:**
    - normaliza o e-mail e verifica se já existe em `usuarios` sem diferenciar maiúsculas;
    - chama `criarClienteAdmin().auth.admin.inviteUserByEmail(email, { data: { nome }, redirectTo: '<origem>/auth/confirmar?next=/redefinir-senha' })`;
    - se o papel escolhido for administrador, atualiza `usuarios.papel` com o cliente do próprio administrador;
    - mostra "Convite enviado para {email}.".
  - **Desativar:**
    - primeiro atualiza `usuarios.ativo` com o cliente do administrador, para o banco aplicar a regra do último administrador e a mensagem aparecer na tela;
    - só se der certo, chama `auth.admin.updateUserById(id, { ban_duration: '876000h' })`;
    - para reativar, `ban_duration: 'none'`.
  - **Configurações:**
    - CNPJ com máscara;
    - limite de ajuste em R$, gravado em centavos;
    - dias de alerta separados por vírgula, aceitando só inteiros positivos.
- [ ] **Passo 5:** rodar `npm test && npm run test:e2e && npx supabase test db && npm run lint && npm run typecheck` e confirmar que tudo passa.
- [ ] **Passo 6:** commit com `Adiciona telas de usuários e configurações`.

### Task 6: CI, migrações nos ambientes de nuvem e manual

**Arquivos:**
- Criar:
  - `.github/workflows/ci.yml`, `.github/workflows/banco-producao.yml`
  - `docs/manual/primeiro-acesso.md`, `docs/manual/convidar-e-desativar-usuario.md`, `docs/manual/publicar-mudancas.md`
- Modificar: `README.md` (seção "Como rodar no computador")

**Interfaces:**
- Consome: todos os scripts de `package.json` das tarefas anteriores.

- [ ] **Passo 1:** escrever o `ci.yml`, que roda em todo `push`.
  - **Job `testes`:**
    1. checkout e `actions/setup-node` com Node 24 e cache de npm;
    2. `npm ci`, `npm run lint`, `npm run typecheck` e `npm test`;
    3. `npx supabase start` (a CLI vem das dependências de desenvolvimento) e `npm run env:local`;
    4. `npx supabase test db`;
    5. `npx playwright install --with-deps chromium` e `npm run test:e2e`.
  - **Job `banco-teste`:**
    - roda depois de `testes`, só em branch diferente de `main`;
    - executa `npx supabase link --project-ref ${{ secrets.SUPABASE_REF_TESTE }} -p ${{ secrets.SUPABASE_SENHA_BANCO_TESTE }}` e depois `npx supabase db push`;
    - usa `SUPABASE_ACCESS_TOKEN` como variável de ambiente.
- [ ] **Passo 2:** escrever o `banco-producao.yml`.
  - Só roda pelo botão "Run workflow" (`workflow_dispatch`), escolhendo o branch.
  - Repete o job `testes` e depois aplica `db push` no `loja-producao`.
- [ ] **Passo 3 (U4, U5, U6):** o usuário cria os projetos, as variáveis e os segredos. Fazer `git push` do branch.
- [ ] **Passo 4:** conferir o resultado, nesta ordem.
  1. O usuário abre a aba Actions do GitHub e confirma que o CI ficou verde e o `banco-teste` aplicou a migração.
  2. Só então vem o U7 no `loja-teste`. Um usuário criado antes da migração fica sem a linha em `usuarios` e não consegue entrar.
  3. Pela pré-visualização da Vercel, o usuário entra e cadastra as duas etapas.
- [ ] **Passo 5:** escrever o manual.
  - **`primeiro-acesso.md`:** U7, cadastro das duas etapas e o que fazer se perder o celular. Neste caso, remover o fator em Supabase, Authentication, Users, e cadastrar de novo.
  - **`convidar-e-desativar-usuario.md`:** passo a passo das duas tarefas.
  - **`publicar-mudancas.md`:**
    1. branch;
    2. CI verde;
    3. conferir a pré-visualização;
    4. "Run workflow" no `banco-producao`, no mesmo branch;
    5. juntar no `main`, o que faz a Vercel publicar a produção.

    Inclui um aviso: os convites para outros e-mails só funcionam depois de configurar o Resend com um domínio próprio (especificação, seções 4 e 13).
  - **README:** como rodar no computador (Docker, `npm install`, `npm run db:iniciar`, `npm run env:local`, `npm run dev`).
- [ ] **Passo 6:** commit com `Adiciona CI, publicação do banco e manual`. Fazer `git push`.
- [ ] **Passo 7 (U7 e aprovação do usuário):**
  1. o usuário aprova a pré-visualização;
  2. roda `banco-producao`;
  3. cria o próprio usuário no `loja-producao`;
  4. juntar `fase-1-1-fundacao` no `main` e fazer `git push`;
  5. conferir que o endereço de produção permite entrar com duas etapas.
