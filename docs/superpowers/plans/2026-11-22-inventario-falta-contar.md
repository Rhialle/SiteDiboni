# Inventário: aviso dos 30 itens e a lista do que falta contar — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** na tela do inventário, avisar quando a busca da contagem chega a 30 variações e mostrar quais variações do escopo ainda não foram contadas, para quem conta e para o administrador na revisão.

**Architecture:** uma função nova no banco (`variacoes_nao_contadas`), só de leitura, devolve as variações do escopo sem contagem; a tela do inventário a chama na segunda rodada (com a contagem aberta, ou para o administrador na revisão) e mostra um bloco `<details>` com a lista. O aviso dos 30 é só da tela.

**Tech Stack:** Postgres/Supabase (pgTAP), Next.js 16.4 (Server Components), Vitest, Playwright (só no GitHub Actions).

**Spec:** [docs/superpowers/specs/2026-11-22-inventario-falta-contar-design.md](../specs/2026-11-22-inventario-falta-contar-design.md)

## Global Constraints

- A lista não mostra saldo: a contagem continua às cegas.
- A funcionária com o inventário em revisão continua vendo só "Em revisão pelo administrador.".
- Os textos que os testes de tela já procuram continuam iguais.
- A função nova **não grava nada** (não chama `lote_geral`); só lê.
- Textos novos da tela ficam em `src/lib/mensagens.ts`.
- Ramo: `inventario-falta-contar`, saindo do `main`. Nada vai para o `main` sem o OK do usuário.
- Testes de banco e de tela rodam só no GitHub Actions; tipos do banco vêm do artefato `tipos-do-banco` do CI (`gh run download <run> -n tipos-do-banco`, salvar em `src/lib/supabase/tipos.ts`).
- A tela segue o padrão das etapas 1 e 2 da fluidez: consultas no mesmo `Promise.all` que a sessão quando não dependem de resposta anterior.

## Review Focus

1. Variação com validade, com um lote contado e outro não: conta como contada e não aparece na lista. Teste de banco na Task 1.
2. Funcionária com o inventário em revisão: não vê a lista nem o número de não contadas. Teste de tela na Task 3.
3. Inventário aprovado ou cancelado: a lista não aparece para ninguém (a revisão já acabou). Teste de tela na Task 3.
4. Nome de produto com acento ou espaço: o link da linha leva à busca certa (código interno na URL, codificado). Teste de tela na Task 3 (código `TP-1`).
5. Tudo contado: o bloco some, sem "Ver as 0 variações". Teste de tela na Task 3.

---

### Task 1: Função `variacoes_nao_contadas` no banco

**Files:**
- Create: `supabase/migrations/20261122130000_inventario_nao_contadas.sql`
- Create: `supabase/tests/database/25_inventario_nao_contadas.test.sql`
- Modify: `src/lib/supabase/tipos.ts` (do artefato do CI)

**Interfaces:**
- Produces: `public.variacoes_nao_contadas(p_inventario bigint) returns table (variacao_id uuid, produto text, variacao text, codigo_interno text)`, em ordem de `produto`, `variacao`. Erros: `'Você não tem permissão para acessar esta página.'` para quem não é usuário ativo; `'Inventário não encontrado.'` para id inexistente.

- [ ] **Step 1: Escrever o teste de banco** `25_inventario_nao_contadas.test.sql`, no estilo de `23_inventario_contagem.test.sql` (mesmos usuários, `criar_produto`, `pg_temp.var`, `pg_temp.lote`). Montagem: FM-1 e FM-2 (Forminha de pão N4 e N5, sem validade), GR-1 (Granulado, com validade, lotes L-A e L-B com saldo), TP-1 (Tampa); inventário de escopo `variacoes` com FM-1, FM-2, GR-1 e TP-1. Conferências:
  - antes de contar: `codigo_interno` devolvidos = `FM-1, FM-2, GR-1, TP-1`, nessa ordem;
  - depois de `contar_item` em FM-1 (lote geral) e em GR-1 só no lote L-A: devolve `FM-2, TP-1`;
  - a função não tem coluna de saldo (`pg_get_function_result` sem "saldo");
  - chamar a função não cria lote (contagem de `lotes` igual antes e depois);
  - inventário `999999` → `throws_ok … 'Inventário não encontrado.'`;
  - funcionária desativada (`update usuarios set ativo = false`, entrar como ela) → `throws_ok … 'Você não tem permissão para acessar esta página.'`;
  - funcionária ativa consegue chamar (`lives_ok`).
- [ ] **Step 2:** Commit "Teste de banco das variações não contadas (ainda falha)", criar o ramo, enviar. Esperado no CI: `25_inventario_nao_contadas` falha porque a função não existe.
- [ ] **Step 3:** Escrever a migração: `language plpgsql stable security definer set search_path = ''`; confere `eh_usuario_ativo()` e a existência do inventário como `resumo_inventario`/`itens_para_contar`; devolve as variações de `variacoes_do_inventario(p_inventario)` sem linha em `inventario_itens` daquele inventário, com `produtos.nome`, `variacoes.nome` e `codigo_interno`, ordenadas por produto e variação.
- [ ] **Step 4:** Commit "Adiciona as variações não contadas do inventário", enviar. Esperado: banco todo verde, inclusive o 25; baixar o artefato `tipos-do-banco`, salvar em `src/lib/supabase/tipos.ts`, commit "Atualiza os tipos do banco com as variações não contadas".

### Task 2: Textos

**Files:**
- Modify: `src/lib/mensagens.ts`, `src/lib/mensagens.test.ts`

**Interfaces:**
- Produces: `MENSAGENS.buscaInventarioLimite = "Mostrando os 30 primeiros. Para achar outro item, busque pelo nome ou pelo código."`, `mensagemNaoContadas(quantidade: number): string` e a constante `LIMITE_BUSCA_INVENTARIO = 30` em `src/lib/inventario/rotulos.ts`.

- [ ] **Step 1: Testes unitários** em `mensagens.test.ts`: `mensagemNaoContadas(1)` → `"Ver a 1 variação não contada"`; `mensagemNaoContadas(28)` → `"Ver as 28 variações não contadas"`.
- [ ] **Step 2:** `npm test -- src/lib/mensagens.test.ts` → falha (função inexistente).
- [ ] **Step 3:** Escrever `mensagemNaoContadas`, `MENSAGENS.buscaInventarioLimite` e `LIMITE_BUSCA_INVENTARIO`.
- [ ] **Step 4:** `npm test`, `npm run lint`, `npm run typecheck` → verdes. Commit "Textos do aviso dos 30 itens e das variações não contadas".

### Task 3: Tela do inventário

**Files:**
- Create: `src/app/(painel)/inventario/[id]/falta-contar.tsx`
- Modify: `src/app/(painel)/inventario/[id]/page.tsx`
- Test: `e2e/inventario.spec.ts`

**Interfaces:**
- Consumes: `variacoes_nao_contadas` (Task 1); `mensagemNaoContadas`, `MENSAGENS.buscaInventarioLimite`, `LIMITE_BUSCA_INVENTARIO` (Task 2).
- Produces: `FaltaContar({ variacoes, buscar }: { variacoes: { variacao_id: string; produto: string; variacao: string; codigo_interno: string }[]; buscar: boolean })` — Server Component; não desenha nada com a lista vazia.

- [ ] **Step 1: Testes de tela** em `e2e/inventario.spec.ts` (inventários de escopo loja com `criarInventarioTeste`; cada teste cria só os produtos de que precisa):
  - `busca com 30 variações avisa que mostra só as 30 primeiras`: 31 produtos (`criarProdutoTeste`, nomes "Item 01" a "Item 31"); a funcionária abre a contagem com a busca vazia → `textoNaTela(page, MENSAGENS.buscaInventarioLimite)` visível.
  - `busca com menos de 30 variações não mostra o aviso`: 2 produtos → o aviso com contagem 0.
  - `quem conta vê o que falta contar e toca para buscar`: Forminha e Tampa (código interno `TP-1`); a funcionária conta Forminha (formulário "Contagem de Forminha – Padrão", quantidade 5, "Salvar contagem"), recarrega, abre "Ver a 1 variação não contada" e vê "Tampa – Padrão" e "TP-1"; clica na linha → URL com `q=TP-1` e a seção "Tampa – Padrão" visível.
  - `administrador vê o que faltou contar na revisão; a funcionária não`: Forminha e Tampa, inventário `em_revisao`; o administrador vê "Ver as 2 variações não contadas"; a funcionária vê "Em revisão pelo administrador." e nenhum texto "não contad".
  - `com tudo contado, a lista some`: só Forminha; a funcionária conta, recarrega → nenhum texto "não contad".
  - `inventário cancelado não mostra a lista`: Forminha, inventário cancelado (administrador cancela pelo botão "Cancelar inventário", como no teste de cancelamento) → nenhum texto "não contad".
- [ ] **Step 2:** Commit "Testes de tela do aviso dos 30 itens e do que falta contar (ainda falham)", enviar. Esperado no CI: os 4 testes que procuram o aviso ou a lista falham; "menos de 30", "tudo contado" e "cancelado" passam (não há bloco hoje): são guardas.
- [ ] **Step 3:** `FaltaContar`: `<details>` fechado, `<summary>` com `mensagemNaoContadas(n)`; cada linha "Produto – Variação" e o código em fonte mono; com `buscar`, a linha é um `Link` para `?q=<codigo_interno codificado>`. Visual de painel de vidro (`vidro`, como as seções da contagem), seguindo o DESIGN.md.
- [ ] **Step 4:** Em `page.tsx`: na segunda rodada, `variacoes_nao_contadas` quando `emContagem` ou (`administrador` e `em_revisao`), no mesmo `Promise.all` de `itens_para_contar` e `revisao_inventario`; erro dela é lançado. Mostrar `<FaltaContar buscar />` depois da lista de itens na contagem, e `<FaltaContar buscar={false} />` antes da tabela "Diferenças" na revisão. O aviso dos 30 aparece logo depois da lista de itens quando `itens.length === LIMITE_BUSCA_INVENTARIO`.
- [ ] **Step 5:** `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` → verdes. Commit "Mostra o aviso dos 30 itens e o que falta contar no inventário", enviar. Esperado: CI todo verde.

### Task 4: Manual e registro

**Files:**
- Modify: `docs/manual/inventario.md`
- Create: `docs/superpowers/plans/2026-11-22-inventario-falta-contar-registro.md`

- [ ] **Step 1:** No manual, na parte da contagem e na da revisão: o aviso dos 30 (buscar pelo nome ou código) e o "Ver as N variações não contadas" (quem vê, que não mostra saldo, tocar numa linha busca o item; não contado não gera ajuste — para zerar, contar 0).
- [ ] **Step 2:** Registro no formato dos registros 1.x: evidências de CI de cada tarefa, decisões (`Ruling:`), revisão final e `minor (deferred)`.
- [ ] **Step 3:** Commit "Manual e registro do que falta contar no inventário", enviar; CI verde. Perguntar ao usuário se junta no `main`.
