# Fluidez, etapa 2: menos idas ao banco — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tirar do painel as idas ao banco que esperam umas pelas outras sem precisar, sem mudar o que cada pessoa vê.

**Architecture:** a sessão passa a ser conferida no próprio servidor do site (`auth.getClaims()`, chave ES256) em vez de perguntar ao servidor de login; a leitura de `usuarios` continua e detecta a desativação. Cada tela dispara as consultas no mesmo `Promise.all` que a leitura da sessão, e as telas com várias rodadas juntam as que não dependem de uma resposta anterior. Nenhuma mudança no banco.

**Tech Stack:** Next.js 16.4 (App Router, Server Components), `@supabase/ssr` + `@supabase/supabase-js` 2.118, Vitest, Playwright (só no GitHub Actions).

**Spec:** [docs/superpowers/specs/2026-11-22-fluidez-2-menos-idas-design.md](../specs/2026-11-22-fluidez-2-menos-idas-design.md)

## Global Constraints

- Nenhuma migração e nenhuma mudança em `supabase/`.
- Os textos das telas não mudam (os testes de tela os procuram).
- A funcionária não vê nada que hoje não vê, inclusive custo.
- Quem foi desativado é levado à mensagem de desativado na hora, como hoje.
- Ramo: `fluidez-2-menos-idas`, saindo do `main`. Nada vai para o `main` sem o OK do usuário.
- Testes de banco e de tela rodam só no GitHub Actions (sem Docker no computador); ler os resultados com `gh run view`.
- Telas novas ou mexidas seguem o padrão da etapa 1: página síncrona com `<Suspense fallback={<Moldura…/>}>` em volta do componente async.
- Registro da execução em `docs/superpowers/plans/2026-11-22-fluidez-2-menos-idas-registro.md`, no formato dos registros dos planos 1.x.

## A regra das consultas junto com a sessão

Vale para as Tasks 3 a 5:

- A sessão entra **no mesmo `Promise.all`** que as consultas: `const [usuario, aR, bR] = await Promise.all([exigirUsuario(), consultaA, consultaB])`. As consultas do Supabase nunca rejeitam (devolvem `{ data, error }`); só o `redirect()` da sessão rejeita. Por isso o redirecionamento sempre ganha de um `notFound()` ou `throw` montado sobre dados vazios.
- As consultas do Supabase só começam quando alguém espera por elas. Não guarde a consulta numa variável para esperar depois: passe-a direto ao `Promise.all`.
- Consulta que hoje depende do papel:
  - tabela fechada pelo banco ao administrador (`custos_variacao`, `notas_entrada_itens_valores`, com a regra "leitura pelo administrador", que devolve vazio para a funcionária) ou aberta a todo usuário ativo (`categorias`, `usuarios`): dispare sempre e mantenha o **uso na tela** condicionado ao papel, como hoje;
  - função do banco que dá erro para a funcionária (`revisao_inventario`): continua depois da sessão, só para o administrador.

## Review Focus

1. Funcionária desativada com uma ficha aberta (estoque de uma variação, nota, produto) recarrega: deve ir para "Este usuário está desativado…", nunca para "não encontrado" nem para tela vazia. Teste novo na Task 3.
2. Funcionária abre o estoque de uma variação ou uma nota: não aparece nenhum custo nem valor. Coberto por "administrador vê o custo médio; funcionária não vê nenhum custo" e "funcionária vê a nota sem valores e sem os botões de ligar".
3. Funcionária abre uma tela de administrador (`/usuarios`, `/categorias`): vê "sem permissão", não um erro. Coberto pelos testes de `usuarios.spec.ts` e `categorias.spec.ts`.
4. Compatibilidade entre variações de dois produtos aparece nas duas fichas, com o nome do outro produto. Coberto por "compatibilidade tampa ↔ pote aparece nas duas fichas".
5. Inventário aprovado ou cancelado não mostra a busca nem os formulários de contagem, mesmo com os itens buscados de antemão. Coberto pelos testes de revisão e cancelamento de `inventario.spec.ts`.

---

### Task 1: Medir o antes

**Files:**
- Create: `docs/superpowers/plans/2026-11-22-fluidez-2-menos-idas-registro.md`

- [ ] **Step 1:** No Chrome (Claude in Chrome), abrir https://diboni-psi.vercel.app/entrar e clicar em **Administrador de teste**. Se o botão não existir, parar e avisar o usuário (falta `ENTRADA_DE_TESTE=1`). Nunca digitar senha.
- [ ] **Step 2:** Anotar os endereços de um produto, de uma nota e de um inventário que existam no banco de teste, clicando nas listas. Se não houver nota ou inventário, medir só os que houver.
- [ ] **Step 3:** No console da página (ferramenta de JavaScript), rodar a medição: cada endereço 1 vez para aquecer e depois 7 vezes, guardando a mediana em ms.

```js
async function medir(caminho, vezes = 7) {
  await fetch(caminho, { headers: { RSC: "1" }, cache: "no-store" }).then((r) => r.text())
  const tempos = []
  for (let i = 0; i < vezes; i++) {
    const t = performance.now()
    await fetch(caminho, { headers: { RSC: "1" }, cache: "no-store" }).then((r) => r.text())
    tempos.push(performance.now() - t)
  }
  tempos.sort((a, b) => a - b)
  return Math.round(tempos[Math.floor(vezes / 2)])
}
// Endereços: /inicio, /produtos, /estoque, /produtos/<id>, /notas/<id>, /inventario/<id>
```

- [ ] **Step 4:** Criar o registro com a tabela "Antes (site principal, main c82d266)": endereço e mediana em ms, mais a data e a hora.

### Task 2: Sessão conferida no próprio servidor

**Files:**
- Modify: `src/lib/auth/sessao.ts` (função `lerSessao`)
- Create: `src/lib/auth/sessao.test.ts`

**Interfaces:**
- Produces: `exigirUsuario()`, `exigirAdministrador()` e `obterUsuarioSessao()` com a mesma assinatura e o mesmo tipo `UsuarioSessao` de hoje. As Tasks 3 a 5 dependem só disso.

- [ ] **Step 1: Escrever os testes que falham.** Simular os módulos com `vi.mock`: `server-only` (módulo vazio), `@/lib/supabase/servidor` (`criarClienteServidor` devolve um cliente falso com `auth.getClaims`, `auth.getUser`, `auth.mfa.getAuthenticatorAssuranceLevel` e `from("usuarios").select().eq().maybeSingle()`) e `next/navigation` (`redirect` lança um erro com o destino na mensagem). Testes:
  - `confere a sessão sem perguntar ao servidor de login`: `getClaims` devolve `{ data: { claims: { sub: "u1", aal: "aal2" } }, error: null }` e a linha `{ id: "u1", nome: "Dona", email: "dona@loja.test", papel: "administrador" }`. Espera `obterUsuarioSessao()` igual à linha com `nivel: "aal2"`, `getUser` e `getAuthenticatorAssuranceLevel` **não** chamados, e `eq` chamado com `("id", "u1")`.
  - `sessão sem duas etapas fica em aal1`: claims com `aal: "aal1"` → `nivel: "aal1"`; claims sem `aal` → `nivel: "aal1"`.
  - `sem sessão vai para /entrar`: `getClaims` devolve `{ data: null, error: null }` → `obterUsuarioSessao()` é `null` e `exigirUsuario()` rejeita com o destino `/entrar`.
  - `sessão inválida vai para /entrar`: `getClaims` devolve `{ data: null, error: { message: "invalid JWT" } }` → `exigirUsuario()` rejeita com `/entrar`.
  - `quem não tem linha em usuarios está desativado`: claims válidos e `maybeSingle` devolve `{ data: null }` → `exigirUsuario()` rejeita com `/sair?motivo=desativado`.
  - `funcionária em tela de administrador vai para /sem-permissao`: linha com `papel: "funcionario"` → `exigirAdministrador()` rejeita com `/sem-permissao`.
- [ ] **Step 2:** `npm test -- src/lib/auth/sessao.test.ts` → falha (o código ainda chama `getUser`).
- [ ] **Step 3:** Em `lerSessao`, trocar `getUser()` por `getClaims()`: sem `claims` (ou com erro) → `{ tipo: "sem-sessao" }`; id = `claims.sub`; `nivel` = `claims.aal === "aal2" ? "aal2" : "aal1"`; tirar a chamada de `mfa.getAuthenticatorAssuranceLevel` e o ramo `user_banned`. A leitura de `usuarios` fica igual. Atualizar o comentário: a desativação é detectada pela linha de `usuarios` (o banco esconde a linha de quem está desativado).
- [ ] **Step 4:** `npm test` (todos), `npm run lint`, `npm run typecheck` → verdes.
- [ ] **Step 5:** Commit "Confere a sessão no próprio servidor, sem ir ao servidor de login", criar o ramo `fluidez-2-menos-idas` se ainda não existir, enviar e conferir no CI: os testes de `entrar.spec.ts` e `usuarios.spec.ts` (inclusive "funcionária desativada com a sessão aberta cai no /entrar") verdes.

### Task 3: As telas simples buscam junto com a sessão

**Files:**
- Modify (o componente async de cada uma): `src/app/(painel)/alertas/page.tsx`, `categorias/page.tsx`, `configuracoes/page.tsx`, `estoque/page.tsx`, `estoque/[variacaoId]/page.tsx`, `estoque/movimentacoes/page.tsx`, `estoque/solicitacoes/page.tsx`, `inicio/page.tsx`, `inventario/page.tsx`, `notas/page.tsx`, `notas/divergencias/page.tsx`, `produtos/page.tsx`, `produtos/novo/page.tsx`, `usuarios/page.tsx`
- Test: `e2e/usuarios.spec.ts`

**Interfaces:**
- Consumes: `exigirUsuario()` / `exigirAdministrador()` da Task 2.

- [ ] **Step 1: Escrever o teste de tela** `funcionária desativada com a ficha do estoque aberta cai no /entrar, sem "não encontrado"` em `e2e/usuarios.spec.ts`: criar um produto com `criarProdutoTeste({ nome: "Forminha desativada" })`, a funcionária entra num contexto próprio e abre `/estoque/<variacaoId>` (vê o título com o nome), o administrador desativa a funcionária (`desativarFuncionaria`), a funcionária recarrega e espera `toHaveURL(/\/entrar\?motivo=desativado/)` e o texto `DESATIVADO`. Limpar o catálogo no fim (`limparCatalogo`). Esse teste já passa hoje: é a guarda contra a regressão do item 1 do Review Focus.
- [ ] **Step 2:** Em cada tela da lista, aplicar "A regra das consultas junto com a sessão". Casos que dependem do papel:
  - `estoque/[variacaoId]`: `custos_variacao` disparada sempre; o custo só é usado se `administrador`;
  - `inventario/page.tsx`: `categorias` disparada sempre; só passada ao formulário de abrir se `administrador`;
  - nas demais, conferir o mesmo ponto ao ler a tela.
  `params` e `searchParams` são lidos antes do `Promise.all` quando a consulta precisa deles.
- [ ] **Step 3:** `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` → verdes.
- [ ] **Step 4:** Commit "Telas do painel buscam os dados junto com a sessão", enviar e conferir no CI: tela inteira verde (inclusive o teste novo e os do Review Focus 2 e 3).

### Task 4: Ficha do produto em 2 rodadas

**Files:**
- Modify: `src/app/(painel)/produtos/[id]/page.tsx` (componente `Produto`)

- [ ] **Step 1:** Primeira rodada, junto com `exigirUsuario()`: as 6 consultas de hoje e mais:
  - `formas_venda` com `faixas_preco(...)` e `variacoes!inner(produto_id)`, filtrada por `variacoes.produto_id = id` (relação `formas_venda_variacao_id_fkey`);
  - `fotos` do produto (hoje na terceira rodada).
- [ ] **Step 2:** Segunda rodada, só se houver variações: `compatibilidades` filtrada pelos ids das variações como hoje, já com as duas pontas embutidas pelas relações `compatibilidades_variacao_a_id_fkey` e `compatibilidades_variacao_b_id_fkey` (`id, nome, codigo_interno, produto_id, produtos(nome)`), o que elimina a quarta rodada (`variacoes … in(outras)`). A montagem de `compatibilidades` escolhe a ponta que não é deste produto, como hoje.
- [ ] **Step 3:** `npm run lint`, `npm run typecheck`, `npm run build` → verdes. Se o tipo inferido das relações embutidas não fechar, conferir os nomes das relações em `src/lib/supabase/tipos.ts`; não editar esse arquivo.
- [ ] **Step 4:** Commit "Ficha do produto em duas rodadas", enviar e conferir no CI: `produtos.spec.ts` inteiro verde (formas, faixas, fotos e as duas compatibilidades).

### Task 5: Nota de entrada e inventário

**Files:**
- Modify: `src/app/(painel)/notas/[id]/page.tsx` (componente `Nota`), `src/app/(painel)/inventario/[id]/page.tsx` (componente `Inventario`)

- [ ] **Step 1: Nota.** Primeira rodada, junto com `exigirUsuario()`: as 3 consultas de hoje e `notas_entrada_itens_valores` filtrada pela nota (`notas_entrada_itens!inner(nota_id)`, relação `notas_entrada_itens_valores_item_id_fkey`), disparada sempre e usada só se `administrador`. Segunda rodada, só se `administrador` e houver itens sem ligação com código de barras: as sugestões por código de barras, como hoje.
- [ ] **Step 2: Inventário.** Primeira rodada, junto com `exigirUsuario()`: `inventarios`, `resumo_inventario` e `itens_para_contar` (a função aceita qualquer situação). O resultado de `itens_para_contar` só é usado se a situação for `aberto`, e um erro dela só é lançado nesse caso. Segunda rodada, em paralelo: as formas de venda dos itens (se houver itens e a situação for `aberto`) e `revisao_inventario` (se `administrador` e `em_revisao`).
- [ ] **Step 3:** `npm run lint`, `npm run typecheck`, `npm run build` → verdes.
- [ ] **Step 4:** Commit "Nota e inventário com menos rodadas", enviar e conferir no CI: `notas.spec.ts` e `inventario.spec.ts` inteiros verdes.

### Task 6: Medir o depois e registrar

**Files:**
- Modify: `docs/superpowers/plans/2026-11-22-fluidez-2-menos-idas-registro.md`

- [ ] **Step 1:** CI do ramo todo verde (banco, unitários, concorrência e tela): anotar o número da execução e os totais.
- [ ] **Step 2:** Abrir a pré-visualização da Vercel do ramo, entrar como **Administrador de teste** e repetir a medição da Task 1 com os mesmos endereços (os ids são os mesmos, porque o banco é o mesmo). Se a pré-visualização pedir login da Vercel, anotar e deixar a medição do depois para quando o ramo for ao `main`, com o OK do usuário.
- [ ] **Step 3:** Completar o registro com a tabela "Depois", a diferença por tela, as decisões tomadas fora do plano (`Ruling:`) e o que ficou para depois (`minor (deferred)`).
- [ ] **Step 4:** Commit "Registro da execução da etapa 2 da fluidez", enviar. Perguntar ao usuário se junta no `main`.
