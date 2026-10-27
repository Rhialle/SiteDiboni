# Fase 1.3: Estoque (Plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** controlar o estoque por lote e validade com as regras R1 a R10 dentro do banco: entrada manual com custo, perdas e ajustes com limite e solicitações, estorno, saída "vence primeiro, sai primeiro" (pronta para a fase 2), saldo por variação e por lote, extrato, alertas no Início e conferência diária.

**Arquitetura:** as tabelas de estoque não aceitam escrita do usuário logado. Toda mudança passa por funções `security definer` que:
- conferem quem chama;
- travam as linhas de saldo da variação em ordem de `lote_id`;
- gravam saldo e movimentação na mesma transação.

Os custos ficam em tabelas que só o administrador lê. As telas são:
- lista de estoque;
- página da variação (lotes, entrada manual, perda ou ajuste);
- extrato com estorno;
- solicitações;
- alertas;
- avisos no Início.

**Tecnologia:** a mesma dos planos 1.1 e 1.2, mais a extensão `pg_cron` do Postgres para a conferência diária.

**Especificação:** [docs/superpowers/specs/2026-10-21-fase-1-base-design.md](../specs/2026-10-21-fase-1-base-design.md). Seções usadas:
- 5 (convenções);
- 6.3 (estoque) e `verificacoes_integridade` de 6.4;
- 7 (R1 a R10);
- 8 (linhas de estoque);
- 10.2, 10.6, 10.7 e 10.9 (telas);
- 11 (testes do banco e de operações ao mesmo tempo);
- 12 (manual).

**Fica fora deste plano:**
- entrada por nota, fornecedores e custo da nota (plano 1.4). A função interna `entrar_no_estoque` já nasce pronta para ela.
- inventário e `ajuste_inventario` (plano 1.6). O tipo de movimentação já existe.
- o aviso "notas aguardando o administrador" no Início (plano 1.4).
- os testes de código de preço por peso e por faixas (seção 11), que vão para o plano 1.6, junto com a entrega.

## Decisões deste plano

Pontos que a especificação não fixa. O primeiro foi decidido pelo usuário; os outros são propostas para revisar com o plano.

1. **Custo na entrada manual:** é obrigatório (decisão do usuário em 2026-10-27). Brinde ou amostra entra com R$ 0,00. O motivo também é obrigatório e aparece no extrato.
2. **Validade na entrada manual:** a entrada recusa uma validade que já passou.
3. **Unidade da quantidade nas telas:**
   - produto por unidade: digita em unidades ou em qualquer forma de venda ativa (ex.: 3 × "Caixa com 100" = 300 un);
   - produto por peso: digita em gramas ou em kg, com até 3 casas.

   O custo é digitado pela mesma unidade escolhida (ex.: R$ 12,00 a caixa) e convertido para a unidade base.
4. **Perdas e lotes vencidos:**
   - perda por vencimento só vale para lote vencido;
   - quebra de pesagem só vale para produto por peso;
   - de um lote vencido, só saem perda por vencimento, estorno e (no plano 1.6) ajuste de inventário. Um ajuste para mais num lote vencido continua permitido.
5. **Estoque mínimo:**
   - conta só os lotes não vencidos;
   - mínimo 0 quer dizer sem alerta;
   - só variações ativas de produtos não inativos geram esse alerta.
6. **Mudanças no produto com estoque:**
   - mudar o tipo de venda de um produto que já tem movimentação é bloqueado, porque a unidade base mudaria de unidade para grama;
   - mudar "controla validade" com saldo maior que zero é bloqueado.
7. **Custo médio sem custo anterior:** quando a variação não tem custo médio, a entrada define o custo médio, mesmo que já exista saldo.
8. **Quem vê as solicitações:** a funcionária vê as dela. O administrador vê e decide todas.
9. **Horário da conferência diária:** roda às 03:00 de São Paulo, que é `0 6 * * *` em UTC no `pg_cron`.

## Restrições globais

- **O que já vale:** tudo o que os planos 1.1 e 1.2 definiram: português do Brasil, R$, fuso de São Paulo, RLS em toda tabela, `anon` sem acesso, administrador só com `aal2`, testes de banco e de tela só no CI e `npm run deps:regenerar` depois de instalar pacote.
- **Next.js 16:** antes de escrever rota, página ou ação nova, ler o guia correspondente em `node_modules/next/dist/docs/` (`AGENTS.md`). Páginas que leem a sessão ou a URL usam `export const instant = false`. Campos de formulário usam `useId()`.
- **Quantidades:** inteiras, em `bigint`, na unidade base (`un` para produto por unidade, `g` para produto por peso).
- **Custo:** `numeric(14,6)`, em reais por unidade base.
- **Valor de perda ou ajuste em centavos:** `round(|quantidade| × custo_medio × 100)`. O `round` do Postgres em `numeric` arredonda meio centavo para cima.
- **Hoje e vencido:** "hoje" é `hoje_sp()` = `(now() at time zone 'America/Sao_Paulo')::date`. Um lote está vencido quando `validade < hoje_sp()`.
- **Escrita bloqueada:** `authenticated` e `anon` não têm `insert`, `update`, `delete` nem `truncate` em `lotes`, `saldos`, `movimentacoes`, `movimentacoes_custos`, `custos_variacao`, `solicitacoes_ajuste` e `verificacoes_integridade`.
- **Leitura:**
  - `lotes`, `saldos` e `movimentacoes`: com `eh_usuario_ativo()`;
  - `solicitacoes_ajuste`: o administrador lê todas; a funcionária lê as dela (`solicitado_por = auth.uid()`);
  - `movimentacoes_custos`, `custos_variacao` e `verificacoes_integridade`: só com `eh_administrador()`.
- **Funções que mexem no estoque:** `security definer` e `set search_path = ''`, conferindo o papel logo no começo.
- **Funções internas:** `hoje_sp` fica liberada. As demais (`travar_saldos`, `lote_geral`, `gerar_codigo_lote`, `movimentar_lote`, `entrar_no_estoque`, `retirar_fefo` e `conferir_integridade_estoque`) levam `revoke execute ... from public, anon, authenticated`. O Supabase dá `execute` a `anon` e `authenticated` por padrão. O `service_role` continua podendo chamar, e os testes de tela usam isso para preparar estoque.
- **R10:** toda função que muda o estoque de uma variação chama antes `travar_saldos(array[variação])`, que trava as linhas de saldo com `FOR UPDATE` em ordem de `lote_id`.
- **Erros do banco:** usam `raise exception` (P0001) com o texto exato da tabela abaixo, que o app repassa (`mensagemDoErroDoBanco`). As repetições (23505) são traduzidas pelo nome da restrição.
- **Limpeza dos testes:** movimentações não se apagam, e um gatilho bloqueia `delete`. Por isso a limpeza usa `truncate` pela conexão do dono do banco, antes de apagar o catálogo:
  - nos testes de tela, `e2e/apoio/banco.ts`, com o pacote `pg` que já está instalado;
  - nos testes de concorrência, `concorrencia/apoio.ts`.

## Textos fixos da interface

| Situação | Texto |
|---|---|
| Saldo insuficiente no lote | `Saldo insuficiente: há {n} {un\|g} neste lote.` |
| Saldo insuficiente na saída FEFO | `Saldo insuficiente: há {n} {un\|g} fora de lotes vencidos.` |
| Validade obrigatória | `Informe a validade: este produto controla validade.` |
| Validade já passou (entrada manual) | `A validade informada já passou.` |
| Lote com outra validade | `O lote {código} já existe com validade {dd/mm/aaaa}.` |
| Custo obrigatório | `Informe o custo (brinde ou amostra entra com 0,00).` |
| Motivo obrigatório | `Informe o motivo.` |
| Quantidade em unidades inválida | `Informe uma quantidade inteira maior que zero.` (já existe) |
| Quantidade em kg inválida | `Informe o peso em kg com até 3 casas, por exemplo 1,250.` |
| Perda no sentido errado | `Perda e quebra só tiram do estoque.` |
| Quebra em produto por unidade | `Quebra de pesagem é só para produto vendido por peso.` |
| Perda por vencimento em lote bom | `Perda por vencimento é só para lote vencido.` |
| Saída de lote vencido | `Lote vencido só sai como perda por vencimento.` |
| Entrada feita | `Entrada registrada.` |
| Perda ou ajuste feito | `Movimentação registrada.` |
| Virou solicitação | `Acima do seu limite: virou uma solicitação para o administrador aprovar.` |
| Solicitação já decidida | `Esta solicitação já foi decidida.` |
| Estorno feito | `Estorno registrado.` |
| Já estornada | `Esta movimentação já foi estornada.` |
| Estorno de estorno | `Um estorno não pode ser estornado.` |
| Movimentação imutável | `Movimentações não podem ser alteradas nem apagadas. Use o estorno.` |
| Tipo de venda com movimentação | `Não dá para mudar o tipo de venda: o produto já tem movimentações de estoque.` |
| Controle de validade com saldo | `Não dá para mudar o controle de validade: o produto tem estoque.` |
| Aviso: vencendo | `{n} lote(s) vencem em até {d} dias` |
| Aviso: vencidos | `{n} lote(s) vencidos com saldo` |
| Aviso: mínimo | `{n} variação(ões) abaixo do estoque mínimo` |
| Aviso: solicitações | `{n} solicitação(ões) pendente(s)` |
| Aviso: conferência | `A conferência de {dd/mm/aaaa} achou {n} diferença(s) entre saldo e movimentações.` |
| Sem avisos | `Nenhum aviso.` |

**Nomes dos tipos de movimentação na tela:** Entrada por nota, Entrada manual, Ajuste de inventário, Ajuste, Perda por vencimento, Perda por avaria, Quebra de pesagem e Estorno.

## Pontos de atenção na revisão

1. **Funcionária registra perda numa variação sem custo médio:** vira solicitação e o estoque não muda (Task 3).
2. **Entrada num lote que já existe, com outra validade:** é recusada e nada muda (Task 2).
3. **Estorno de uma entrada da qual parte já saiu:** é recusado, e o saldo e o custo médio continuam os mesmos (Task 4).
4. **Peso e formas de venda digitados:**
   - "1,250" kg vira 1.250 g;
   - "1,2505" kg é recusado;
   - 3 × "Caixa com 100" vira 300 un.

   Fica na Task 7.
5. **Lote vencido:**
   - uma perda por avaria nele é recusada (Task 3);
   - a saída FEFO pula esse lote (Task 5);
   - ele aparece em "vencidos com saldo" (Task 6).

---

### Task 1: Banco: estrutura do estoque, permissões e travas

**Arquivos:**
- Criar:
  - `supabase/migrations/<ts>_estoque_estrutura.sql`
  - `supabase/tests/database/10_estoque_estrutura.test.sql`
  - `e2e/apoio/banco.ts`
- Modificar:
  - `e2e/apoio/supabase.ts` (`limparCatalogo` chama `limparEstoque()` primeiro)
  - `concorrencia/apoio.ts` (`limparCatalogo` faz `truncate` do estoque primeiro)
  - `src/lib/supabase/tipos.ts` (artefato do CI)

**Interfaces:**
- Produz:
  - **enums:**
    - `tipo_movimentacao ('entrada_nota','entrada_manual','ajuste_inventario','ajuste_manual','perda_vencimento','perda_avaria','quebra_pesagem','estorno')`
    - `situacao_solicitacao ('pendente','aprovada','recusada')`
  - **tabelas:**
    - `lotes(id uuid pk, variacao_id uuid not null references variacoes, codigo text not null check 1..40, validade date null, criado_em timestamptz default now())`, com restrição `lotes_codigo_por_variacao unique (variacao_id, codigo)`
    - `saldos(lote_id uuid pk references lotes, variacao_id uuid not null references variacoes, quantidade bigint not null default 0)`, com restrição `saldos_nao_negativo check (quantidade >= 0)`
    - `movimentacoes(id bigint generated always as identity pk, variacao_id uuid not null references variacoes, lote_id uuid not null references lotes, tipo tipo_movimentacao not null, quantidade bigint not null check (quantidade <> 0), motivo text not null default '', origem text null, origem_id text null, estorno_de bigint null references movimentacoes, usuario_id uuid not null, aprovado_por uuid null, criado_em timestamptz default now())`
      - `usuario_id` fica sem chave estrangeira, como em `historico_cadastro`.
      - restrição `movimentacoes_estorno_de_key unique (estorno_de)`;
      - restrição `movimentacoes_sentido`: entradas `> 0`; perdas e quebra `< 0`; ajustes e estorno com qualquer sinal; e `(tipo = 'estorno') = (estorno_de is not null)`;
      - índices em `(variacao_id, criado_em desc)` e em `(criado_em desc)`.
    - `movimentacoes_custos(movimentacao_id bigint pk references movimentacoes, custo_unitario numeric(14,6) not null check >= 0)`
    - `custos_variacao(variacao_id uuid pk references variacoes, custo_medio numeric(14,6) not null check >= 0, atualizado_em timestamptz default now())`
    - `solicitacoes_ajuste(id bigint identity pk, variacao_id uuid not null references variacoes, lote_id uuid not null references lotes, tipo tipo_movimentacao not null check in ('ajuste_manual','perda_avaria','perda_vencimento','quebra_pesagem'), quantidade bigint not null check <> 0, motivo text not null, solicitado_por uuid not null, solicitado_em timestamptz default now(), situacao situacao_solicitacao not null default 'pendente', decidido_por uuid null, decidido_em timestamptz null)`
    - `verificacoes_integridade(id bigint identity pk, executada_em timestamptz default now(), divergencias jsonb not null default '[]')`
  - **funções:**
    - `hoje_sp(): date` (`stable`)
    - `travar_saldos(p_variacoes uuid[]): void`
    - `lote_geral(p_variacao uuid): uuid`: devolve o lote `GERAL` (sem validade) da variação e cria o lote e o saldo 0 se não existirem
    - `gerar_codigo_lote(p_variacao uuid, p_prefixo text): text`: monta `{prefixo}-AAAA-MM-DD` com `hoje_sp()` e, se já existir na variação, tenta `-2`, `-3` e assim por diante (R7)
    - `movimentar_lote(p_lote uuid, p_tipo tipo_movimentacao, p_quantidade bigint, p_motivo text, p_usuario uuid, p_origem text default null, p_origem_id text default null, p_estorno_de bigint default null, p_aprovado_por uuid default null): bigint`: cria a linha de saldo se faltar; trava; aplica R1 e R4; soma ao saldo; insere a movimentação; devolve o `id`
  - **gatilhos:**
    - `movimentacoes_imutaveis` (`before update or delete`): lança o texto da movimentação imutável;
    - `lotes_combinam_com_produto` (`before insert`): se o produto controla validade, `validade` é obrigatória (texto da validade obrigatória); se não controla, só aceita `codigo = 'GERAL'` com `validade` nula;
    - `produtos_tipo_venda_sem_movimentacao` (`before update of tipo_venda on produtos`);
    - `produtos_validade_sem_saldo` (`before update of controla_validade on produtos`).

- [ ] **Passo 1: escrever o teste que falha**, `10_estoque_estrutura.test.sql`. Ele cria a dona (`…0a`, administradora com aal2), a funcionária (`…0b`), um produto sem validade ("Forminha") e um com validade ("Granulado", por peso).

```sql
-- lote_geral(<var. forminha>) cria 'GERAL' com validade nula; chamar de novo devolve o mesmo id
-- insert em lotes de Granulado sem validade → P0001 'Informe a validade: este produto controla validade.'
-- gerar_codigo_lote(<var. granulado>, 'ENT') = 'ENT-' || to_char(hoje_sp(), 'YYYY-MM-DD'); com esse lote criado → mesmo código || '-2'
-- movimentar_lote(<GERAL>, 'ajuste_manual', 30, 'teste', <dona>) → saldo 30
-- movimentar_lote(<GERAL>, 'ajuste_manual', -31, ...) → P0001 'Saldo insuficiente: há 30 un neste lote.'; saldo continua 30
-- lote vencido do Granulado (validade hoje_sp() - 1) com 100 g:
--   'perda_avaria' -10 → P0001 'Lote vencido só sai como perda por vencimento.'; 'perda_vencimento' -10 vive
-- movimentar_lote com tipo 'perda_avaria' e quantidade +5 → 23514 (movimentacoes_sentido)
-- update e delete em movimentacoes (como dono do banco) → P0001 'Movimentações não podem ser alteradas nem apagadas. Use o estorno.'
-- update produtos set tipo_venda = 'peso' (Forminha, com movimentação) → P0001 'Não dá para mudar o tipo de venda: o produto já tem movimentações de estoque.'
-- update produtos set controla_validade = true (Forminha, saldo 30) → P0001 'Não dá para mudar o controle de validade: o produto tem estoque.'
-- como funcionária: lê lotes, saldos e movimentacoes; lê 0 linhas de custos_variacao e movimentacoes_custos;
--   insert em saldos → 42501; select movimentar_lote(...) → 42501 (sem execute)
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHA porque as relações não existem.
- [ ] **Passo 3:** escrever a migração.
  - **`movimentar_lote`:**
    - lê o saldo do lote com `for update`;
    - se `saldo + p_quantidade < 0`, lança o texto do saldo insuficiente, com `un` ou `g` conforme o `tipo_venda` do produto;
    - **R4:** quantidade negativa num lote com `validade < hoje_sp()` só passa com os tipos `perda_vencimento`, `estorno` e `ajuste_inventario`;
    - grava `usuario_id = p_usuario`.
  - **RLS e privilégios:** como em "Restrições globais", nas 7 tabelas novas.
- [ ] **Passo 4:** limpeza dos testes.
  - **`e2e/apoio/banco.ts`:** exporta `limparEstoque(): Promise<void>`. Abre um `pg.Client` em `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (e recusa outro host) e roda `truncate public.movimentacoes_custos, public.movimentacoes, public.solicitacoes_ajuste, public.saldos, public.lotes, public.custos_variacao, public.verificacoes_integridade restart identity cascade`.
  - **`concorrencia/apoio.ts`:** o `limparCatalogo` roda o mesmo `truncate` antes dos `delete`.
- [ ] **Passo 5:** enviar e confirmar no CI que PASSA, com os testes de tela e de concorrência que já existiam continuando verdes. Atualizar os tipos.
- [ ] **Passo 6:** commit com `Cria a estrutura do estoque no banco`.

### Task 2: Banco: entradas e custo médio

**Arquivos:**
- Criar: `supabase/migrations/<ts>_estoque_entradas.sql`, `supabase/tests/database/11_estoque_entradas.test.sql`

**Interfaces:**
- Consome: as funções da Task 1.
- Produz:
  - `entrar_no_estoque(p_variacao uuid, p_quantidade bigint, p_custo_unitario numeric, p_validade date, p_codigo_lote text, p_tipo tipo_movimentacao, p_motivo text, p_usuario uuid, p_origem text default null, p_origem_id text default null): bigint` (interna; o plano 1.4 vai usá-la com `entrada_nota`)
  - `registrar_entrada_manual(p_variacao uuid, p_quantidade bigint, p_custo_unitario numeric, p_motivo text, p_validade date default null, p_codigo_lote text default null): bigint` (pública, só administrador)

- [ ] **Passo 1: escrever o teste que falha**, `11_estoque_entradas.test.sql`, como administradora:

```sql
-- Forminha (sem validade): entrada 100 a 0,05 → lote GERAL com 100; custo_medio 0.050000; movimentacoes_custos 0.050000
-- 2ª entrada 300 a 0,09 → saldo 400; custo_medio 0.080000   ((100×0,05 + 300×0,09) ÷ 400)
-- Granulado (com validade):
--   sem validade → 'Informe a validade: este produto controla validade.'
--   validade ontem → 'A validade informada já passou.'
--   sem código, validade hoje+60 → lote 'ENT-{hoje}'; de novo sem código → 'ENT-{hoje}-2' (lote novo)
--   código 'L1' validade hoje+60, depois 'L1' validade hoje+60 → soma no mesmo lote
--   código 'L1' validade hoje+90 → 'O lote L1 já existe com validade {dd/mm/aaaa}.'; nada muda
-- custo nulo → 'Informe o custo (brinde ou amostra entra com 0,00).'; custo 0 vive
-- motivo vazio → 'Informe o motivo.'
-- saldo volta a 0 (movimentar_lote como dono) e nova entrada a 0,20 → custo_medio 0.200000
-- variação sem custo médio e com saldo (ajuste como dono) + entrada a 0,30 → custo_medio 0.300000
-- como funcionária: registrar_entrada_manual → 'Você não tem permissão para acessar esta página.'
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHA.
- [ ] **Passo 3:** escrever a migração.
  - **`entrar_no_estoque`:**
    1. exige quantidade `> 0`, custo não nulo e `>= 0`, e tipo `entrada_*`;
    2. escolhe o lote:
       - produto sem validade: `lote_geral`;
       - com validade: o código digitado (em `trim`) ou `gerar_codigo_lote(…, 'ENT')`;
       - lote que já existe com outra validade: recusa;
    3. chama `travar_saldos`;
    4. calcula `saldo_total` (todos os lotes) e o custo médio (R9 e decisão 7), com `round(…, 6)`;
    5. chama `movimentar_lote` e grava em `movimentacoes_custos`;
    6. faz `upsert` em `custos_variacao`.
  - **`registrar_entrada_manual`:**
    - exige `eh_administrador()`, motivo com texto e validade que não passou;
    - chama `entrar_no_estoque` com `entrada_manual` e `auth.uid()`.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSA. Atualizar os tipos.
- [ ] **Passo 5:** commit com `Adiciona entradas e custo médio no estoque`.

### Task 3: Banco: perdas, ajustes e solicitações

**Arquivos:**
- Criar: `supabase/migrations/<ts>_estoque_perdas.sql`, `supabase/tests/database/12_estoque_perdas.test.sql`

**Interfaces:**
- Produz:
  - `registrar_perda_ou_ajuste(p_variacao uuid, p_lote uuid, p_tipo tipo_movimentacao, p_quantidade bigint, p_motivo text): text`
    - devolve `'registrada'` ou `'solicitacao'`;
    - `p_quantidade` vem com o sinal da movimentação (negativa = sai);
    - `p_lote` nulo usa `lote_geral` e só é aceito em produto sem validade (R5).
  - `decidir_solicitacao(p_solicitacao bigint, p_aprovar boolean): void`

- [ ] **Passo 1: escrever o teste que falha**, `12_estoque_perdas.test.sql`. A Forminha tem 2.000 un a 0,05 de custo médio. O limite é o padrão, 5000 centavos.

```sql
-- administradora: perda_avaria -10 → 'registrada'; saldo 1990; motivo gravado
-- motivo vazio → 'Informe o motivo.'; perda_avaria +10 → 'Perda e quebra só tiram do estoque.'
-- quebra_pesagem na Forminha → 'Quebra de pesagem é só para produto vendido por peso.'
-- perda_vencimento em lote bom do Granulado → 'Perda por vencimento é só para lote vencido.'; em lote vencido → vive
-- saldo 30 num lote do Granulado, perda 31 → 'Saldo insuficiente: há 30 g neste lote.'
-- funcionária: perda -1000 (= 5000 centavos, não passa do limite) → 'registrada'
-- funcionária: perda -1001 (= 5005 centavos) → 'solicitacao'; saldo não muda; 1 solicitação 'pendente'
-- funcionária numa variação sem custo médio: perda -1 → 'solicitacao'
-- funcionária: lê só a solicitação dela; decidir_solicitacao → 'Você não tem permissão para acessar esta página.'
-- administradora aprova → movimentação com usuario_id = funcionária, aprovado_por = dona,
--   origem 'solicitacao', origem_id = id; saldo cai; aprovar de novo → 'Esta solicitação já foi decidida.'
-- aprovar quando o saldo não basta mais → texto do saldo insuficiente; a solicitação continua 'pendente'
-- recusar → 'recusada', com decidido_por e decidido_em; saldo não muda
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHA.
- [ ] **Passo 3:** escrever a migração.
  - **`registrar_perda_ou_ajuste`:**
    1. exige `eh_usuario_ativo()`, motivo, tipo entre os 4 permitidos e o sinal certo;
    2. aplica a regra da quebra só para peso e a da perda por vencimento só em lote vencido;
    3. chama `travar_saldos` e confere o saldo (o mesmo texto de `movimentar_lote`) também quando a perda vai virar solicitação;
    4. se quem chama não é administrador e (não há custo médio ou `round(|q| × custo × 100) > limite_ajuste_centavos`), grava uma solicitação e devolve `'solicitacao'`. O texto nunca mostra o custo.
  - **`decidir_solicitacao`:**
    - exige `eh_administrador()`;
    - trava a solicitação com `for update` e recusa se não estiver `pendente`;
    - para aprovar, refaz as regras e chama `movimentar_lote(…, p_usuario => solicitado_por, p_origem => 'solicitacao', p_origem_id => id, p_aprovado_por => auth.uid())`.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSA. Atualizar os tipos.
- [ ] **Passo 5:** commit com `Adiciona perdas, ajustes e solicitações no estoque`.

### Task 4: Banco: estorno e extrato

**Arquivos:**
- Criar: `supabase/migrations/<ts>_estoque_estorno.sql`, `supabase/tests/database/13_estoque_estorno.test.sql`

**Interfaces:**
- Produz:
  - `estornar_movimentacao(p_movimentacao bigint, p_motivo text): bigint` (só administrador)
  - view `extrato_movimentacoes` (`security_invoker = true`) com:
    - dados da movimentação: `id`, `criado_em`, `tipo`, `quantidade`, `motivo`, `origem`, `origem_id`, `estorno_de`, `estornada boolean`;
    - variação e produto: `variacao_id`, `variacao`, `codigo_interno`, `produto_id`, `produto`, `tipo_venda`;
    - lote: `lote_id`, `lote` (nulo quando é `GERAL`), `validade`;
    - pessoas: `usuario` (nome), `aprovado_por_nome`.

- [ ] **Passo 1: escrever o teste que falha**, `13_estoque_estorno.test.sql`:

```sql
-- entradas 100 a 0,05 e 300 a 0,09 (médio 0,08); estorna a 2ª → saldo 100; custo_medio 0.050000
-- a 2ª aparece com estornada = true no extrato; o estorno tem tipo 'estorno', quantidade -300 e estorno_de = id da 2ª
-- estornar a 2ª de novo → 'Esta movimentação já foi estornada.'; estornar o estorno → 'Um estorno não pode ser estornado.'
-- entrada 100, perda 60, estorno da entrada → 'Saldo insuficiente: há 40 un neste lote.'; saldo 40; custo médio igual
-- estorno da perda → saldo volta; custo médio igual
-- única entrada 100 a 0,05 e estorno → saldo 0; custo médio continua 0,05 (saldo restante zero)
-- entradas 100 a 0,01 e 100 a 0,10 (médio 0,055), perda 90, estorno da 2ª → resultado negativo: custo médio continua 0,055
-- motivo vazio → 'Informe o motivo.'; como funcionária → 'Você não tem permissão para acessar esta página.'
-- funcionária lê o extrato (sem custo: a view não tem coluna de custo)
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHA.
- [ ] **Passo 3:** escrever a migração.
  - **`estornar_movimentacao`:**
    1. exige `eh_administrador()` e motivo;
    2. lê a original e chama `travar_saldos` da variação dela;
    3. recusa estorno de estorno e movimentação já estornada (conferida depois da trava, para a segunda de duas chamadas ao mesmo tempo ver a primeira);
    4. chama `movimentar_lote(lote, 'estorno', -quantidade, motivo, auth.uid(), p_estorno_de => id)`;
    5. se a original é uma entrada, recalcula o custo médio pela R9:

       `(S × C − q × c) ÷ (S − q)`, com `S` o saldo total antes do estorno, `C` o custo médio atual, `q` a quantidade da entrada e `c` o custo dela. Mantém `C` se `S − q = 0` ou se o resultado der negativo.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSA. Atualizar os tipos.
- [ ] **Passo 5:** commit com `Adiciona estorno e extrato do estoque`.

### Task 5: Banco: saída FEFO e operações ao mesmo tempo

**Arquivos:**
- Criar:
  - `supabase/migrations/<ts>_estoque_fefo.sql`
  - `supabase/tests/database/14_estoque_fefo.test.sql`
  - `concorrencia/estoque.test.ts`
- Modificar: `concorrencia/apoio.ts`

**Interfaces:**
- Produz:
  - `retirar_fefo(p_variacao uuid, p_quantidade bigint, p_tipo tipo_movimentacao, p_motivo text, p_usuario uuid, p_origem text default null, p_origem_id text default null)`, que devolve `table (lote_id uuid, quantidade bigint)`. É interna: a venda da fase 2 vai chamá-la.
  - em `concorrencia/apoio.ts`, `abrirTransacao(): Promise<Client>`: uma conexão do dono do banco já com `begin`, registrada para `fecharAbas()`.

- [ ] **Passo 1: escrever os testes que falham.**

`14_estoque_fefo.test.sql`, com o Granulado e as datas da especificação trocadas por datas relativas a hoje:

```sql
-- lote A 200 g (vence hoje+10), B 5000 g (vence hoje+70), C 1000 g (vencido): retirar 350
--   → devolve (A, 200) e (B, 150); saldos A 0, B 4850, C 1000; 2 movimentações
-- dois lotes com a mesma validade: sai primeiro o criado antes
-- pedir 6000 com 4850 disponíveis → 'Saldo insuficiente: há 4850 g fora de lotes vencidos.'; nada muda
-- Forminha com saldo 30 e retirada de 31 → recusada; saldo 30
-- como funcionária: select retirar_fefo(...) → 42501
```

`concorrencia/estoque.test.ts`:

```ts
it("duas retiradas da última unidade ao mesmo tempo: exatamente uma consegue")
// duas transações chamam retirar_fefo(v, 1, …); a 2ª espera a trava (esperarTerminarOuTravar);
// a 1ª confirma; a 2ª recebe 'Saldo insuficiente: há 0 un fora de lotes vencidos.'; saldo final 0
it("dois estornos da mesma movimentação ao mesmo tempo: só um passa")      // 2ª: 'Esta movimentação já foi estornada.'
it("duas aprovações da mesma solicitação ao mesmo tempo: o estoque muda uma vez") // 2ª: 'Esta solicitação já foi decidida.'
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM: `retirar_fefo` não existe; nos estornos e nas aprovações, a segunda passa ou dá outro erro.
- [ ] **Passo 3:** escrever a migração.
  - **`retirar_fefo`:**
    1. chama `travar_saldos`;
    2. soma o disponível dos lotes com saldo `> 0` e `validade` nula ou `>= hoje_sp()`; se não basta, lança o texto da saída FEFO;
    3. percorre esses lotes por `validade nulls last, criado_em` e chama `movimentar_lote` em cada um.
  - **Ajustes de concorrência:** se os testes de estorno ou aprovação mostrarem uma corrida, ajustar a trava nas funções das Tasks 3 e 4 nesta mesma migração. As anteriores já estão no banco de teste.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a saída FEFO e testes de operações ao mesmo tempo`.

### Task 6: Banco: busca de estoque, alertas, avisos e conferência diária

**Arquivos:**
- Criar: `supabase/migrations/<ts>_estoque_consultas.sql`, `supabase/tests/database/15_estoque_consultas.test.sql`

**Interfaces:**
- Produz (as consultas são `stable security invoker`, exceto a conferência):
  - `buscar_estoque(p_termo text default null, p_so_com_saldo boolean default false, p_limite int default 50, p_deslocamento int default 0)`, que devolve uma tabela com:
    - `variacao_id`, `produto_id`, `produto`, `variacao`, `codigo_interno`;
    - `tipo_venda`, `controla_validade`;
    - `saldo_total bigint`, `saldo_disponivel bigint`, `estoque_minimo bigint`, `proxima_validade date`, `total bigint`.

    O termo casa como em `buscar_produtos`: nome sem acento, código interno ou de barras. A ordem é produto e depois variação.
  - `alertas_estoque()`, que devolve uma tabela com:
    - `tipo text` (`'vencendo'` | `'vencido'` | `'abaixo_minimo'`);
    - `produto_id`, `produto`, `variacao_id`, `variacao`, `codigo_interno`, `tipo_venda`;
    - `lote_id`, `lote`, `validade`, `dias_para_vencer int`, `faixa_dias int`;
    - `saldo bigint`, `estoque_minimo bigint`.
  - `avisos_inicio()`, que devolve uma linha com:
    - `vencendo int`, `faixa_maior int`, `vencidos int`, `abaixo_minimo int`, `solicitacoes_pendentes int`;
    - `conferencia_em timestamptz`, `conferencia_divergencias int`. Estas duas ficam nulas para a funcionária, pela RLS.
  - `conferir_integridade_estoque(): void` (interna, `security definer`)
  - tarefa do `pg_cron` chamada `conferir-estoque`, com horário `0 6 * * *`

- [ ] **Passo 1: escrever o teste que falha**, `15_estoque_consultas.test.sql`, com `dias_alerta_validade` padrão `{30,15,7}`:

```sql
-- buscar_estoque('forminha') acha pela variação; buscar_estoque(null, true) só traz saldo > 0
-- buscar_estoque: saldo_disponivel não conta lote vencido; proxima_validade = menor validade não vencida com saldo
-- lote com saldo vencendo em hoje+5 → 'vencendo', faixa_dias 7; hoje+20 → faixa_dias 30; hoje+40 → fora
-- lote vencendo em hoje+5 com saldo 0 → fora; lote vencido com saldo → 'vencido'; vencido com saldo 0 → fora
-- estoque_minimo 500, disponível 300 e 400 vencidos → 'abaixo_minimo'; produto inativo → fora; mínimo 0 → fora
-- conferir_integridade_estoque() com tudo certo → última verificação com divergencias '[]'
-- update saldos set quantidade = quantidade + 1 (como dono) e conferir de novo → 1 divergência com aquele lote_id
-- cron.job tem 'conferir-estoque' com schedule '0 6 * * *'
-- avisos_inicio() como funcionária: conferencia_em nulo; solicitacoes_pendentes conta só as dela
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHA.
- [ ] **Passo 3:** escrever a migração.
  - **Faixas de vencimento:**
    - "vencendo" vai de `hoje_sp()` até `hoje_sp() + max(dias_alerta_validade)`;
    - `faixa_dias` é o menor valor da configuração que seja `>= dias_para_vencer`.
  - **Conferência:**
    - compara, por lote, `saldos.quantidade` com `sum(movimentacoes.quantidade)` (lotes dos dois lados);
    - grava `[{variacao_id, lote_id, saldo, soma}]`.
  - **`pg_cron`:**
    - `create extension if not exists pg_cron with schema pg_catalog;`
    - `select cron.schedule('conferir-estoque', '0 6 * * *', 'select public.conferir_integridade_estoque()');`
    - Se o `db push` do banco de teste recusar a extensão, ver a seção "Cron" do guia do Supabase e ajustar nesta mesma migração, antes de ela chegar à nuvem.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSA, inclusive o `banco-teste`, que aplica a migração na nuvem. Atualizar os tipos.
- [ ] **Passo 5:** commit com `Adiciona busca, alertas e conferência diária do estoque`.

### Task 7: App: lista de estoque e página da variação

**Arquivos:**
- Criar:
  - `src/lib/estoque/quantidade.ts` e `src/lib/estoque/quantidade.test.ts`
  - `src/lib/estoque/rotulos.ts`
  - `src/app/(painel)/estoque/page.tsx`
  - `src/app/(painel)/estoque/[variacaoId]/page.tsx`
  - `e2e/estoque.spec.ts`
- Modificar:
  - `src/lib/formatacao.ts` (`formatarCusto`)
  - `src/lib/mensagens.ts` e `src/lib/catalogo/erros.ts` (`movimentacoes_estorno_de_key` vira o texto de "Já estornada")
  - `src/app/(painel)/layout.tsx` (links "Estoque" e "Alertas" para todos)
  - `src/app/(painel)/produtos/[id]/variacoes.tsx` (link "Estoque" em cada variação)
  - `e2e/apoio/supabase.ts`

**Interfaces:**
- Produz:
  - `paraUnidadeBase(texto: string, fator: number, casas: 0 | 3): number | null`: lê decimal com vírgula e até `casas` casas, multiplica pelo fator e devolve `null` se não der inteiro maior que zero;
  - `custoUnitarioBase(texto: string, fator: number): string | null`: reais pela unidade escolhida divididos pelo fator, com `toFixed(6)`; `null` se o texto não for valor;
  - `unidadesDeDigitacao(tipoVenda: "unidade" | "peso", formas: { id: string; nome: string; fator: number; peso_variavel: boolean; ativa: boolean }[]): { valor: string; rotulo: string; fator: number; casas: 0 | 3 }[]`:
    - produto por unidade: `un` (fator 1) e as formas ativas que não são granel;
    - produto por peso: `g` (fator 1) e `kg` (fator 1000, 3 casas).
  - `formatarQuantidade(base: number, tipoVenda: "unidade" | "peso"): string` (ex.: `"1.234 un"`, `"5.000 g"`)
  - `formatarCusto(valor: string | number): string` (R$ com 2 a 6 casas, ex.: `"R$ 0,05"` e `"R$ 0,0125"`)
  - `ROTULO_TIPO_MOVIMENTACAO: Record<string, string>`
  - nos testes de tela:
    - `criarEstoqueTeste(variacaoId, { quantidade, custo, usuarioId, validade?, codigo? })`, que chama a RPC `entrar_no_estoque` com o cliente de serviço;
    - `dataDaqui(dias: number): string` (`AAAA-MM-DD` em São Paulo).

- [ ] **Passo 1: escrever os testes que falham.**

`quantidade.test.ts`:

```ts
expect(paraUnidadeBase("3", 100, 0)).toBe(300)
expect(paraUnidadeBase("1,250", 1000, 3)).toBe(1250)
expect(paraUnidadeBase("1,2505", 1000, 3)).toBeNull()
expect(paraUnidadeBase("2,5", 1, 0)).toBeNull()
expect(paraUnidadeBase("0", 1, 0)).toBeNull()
expect(custoUnitarioBase("12,00", 100)).toBe("0.120000")
expect(custoUnitarioBase("32,00", 1000)).toBe("0.032000")
expect(formatarQuantidade(5000, "peso")).toBe("5.000 g")
expect(unidadesDeDigitacao("peso", []).map((u) => u.valor)).toEqual(["g", "kg"])
```

`e2e/estoque.spec.ts`:

```ts
test("lista mostra saldo total e disponível; a busca acha pelo código interno")
test("página da variação mostra os lotes por validade, com o vencido marcado e o total")
test("administrador vê o custo médio; funcionária não vê nenhum custo")  // a página da funcionária não contém "Custo"
test("produto sem controle de validade mostra só o saldo, sem a tabela de lotes")
```

- [ ] **Passo 2:** rodar `npm test` (FALHA: módulo inexistente) e enviar para confirmar no CI que os testes de tela FALHAM.
- [ ] **Passo 3:** implementar.
  - **`/estoque`:**
    - busca e caixa "Só com saldo" (formulário GET);
    - 50 por página, com a mesma `key` por página e busca da lista de produtos;
    - colunas Produto, Variação, Código, Saldo, Disponível, Próxima validade e Mínimo.
  - **`/estoque/[variacaoId]`:**
    - cabeçalho com produto, variação e código;
    - tabela de lotes, só se o produto controla validade, com Lote, Validade (`dd/mm/aaaa`, "Vencido" quando passou) e Saldo, ordenada por validade;
    - totais e "Custo médio" só para o administrador (lido de `custos_variacao`);
    - link "Ver extrato" para `/estoque/movimentacoes?variacao={id}`.
- [ ] **Passo 4:** rodar `npm test`, `npm run lint` e `npm run typecheck`, enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a lista de estoque e a página da variação`.

### Task 8: App: entrada manual

**Arquivos:**
- Criar:
  - `src/app/(painel)/estoque/[variacaoId]/acoes.ts`
  - `src/app/(painel)/estoque/[variacaoId]/entrada-manual.tsx`
- Modificar: `src/app/(painel)/estoque/[variacaoId]/page.tsx`, `e2e/estoque.spec.ts`

**Interfaces:**
- Consome: `registrar_entrada_manual` (Task 2), `paraUnidadeBase`, `custoUnitarioBase` e `unidadesDeDigitacao` (Task 7).
- Produz:
  - `type EstadoEstoque = { erro: string; sucesso: string; valores: Record<string, string> | null }`, que devolve o que foi digitado quando há erro (o React limpa o formulário);
  - `registrarEntrada(variacaoId: string, _estado: EstadoEstoque, formData: FormData): Promise<EstadoEstoque>`.

- [ ] **Passo 1: escrever os testes de tela que falham.**

```ts
test("administrador dá entrada de 3 Caixas com 100 a R$ 12,00 a caixa: lote ENT de hoje com 300 un e custo médio R$ 0,12")
test("entrada sem custo mostra a mensagem e não muda o saldo")      // 'Informe o custo (brinde ou amostra entra com 0,00).'
test("produto com validade sem a data mostra a mensagem")          // 'Informe a validade: este produto controla validade.'
test("granulado: 1,250 kg entra como 1.250 g")
test("funcionária não vê o formulário de entrada manual")
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
  - **Formulário "Entrada manual"** (só administrador), com os campos:
    - Quantidade e "Em" (as unidades de digitação);
    - Custo (R$ por {unidade escolhida});
    - Validade (`type="date"`, só se o produto controla validade);
    - Lote (opcional, só com validade);
    - Motivo.
  - **Mensagens do app:** quantidade inválida usa o texto de unidades ou o de kg, conforme `casas`; custo vazio usa o texto do custo obrigatório.
  - **Ao dar certo:** `revalidatePath` da página e o texto da entrada feita.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a entrada manual de estoque`.

### Task 9: App: perda ou ajuste e solicitações

**Arquivos:**
- Criar:
  - `src/app/(painel)/estoque/[variacaoId]/perda-ajuste.tsx`
  - `src/app/(painel)/estoque/solicitacoes/page.tsx`
  - `src/app/(painel)/estoque/solicitacoes/acoes.ts`
  - `e2e/estoque-perdas.spec.ts`
- Modificar: `src/app/(painel)/estoque/[variacaoId]/acoes.ts` e `page.tsx`

**Interfaces:**
- Consome: `registrar_perda_ou_ajuste` e `decidir_solicitacao` (Task 3).
- Produz:
  - `registrarPerdaOuAjuste(variacaoId: string, _estado: EstadoEstoque, formData: FormData): Promise<EstadoEstoque>`;
  - `decidirSolicitacao(id: number, aprovar: boolean): Promise<{ erro: string; sucesso: string }>`.

- [ ] **Passo 1: escrever os testes de tela que falham.**

```ts
test("funcionária registra perda por avaria dentro do limite: saldo cai")       // 'Movimentação registrada.'
test("funcionária passa do limite: vira solicitação e o saldo não muda")       // texto de "Virou solicitação"
test("administrador aprova a solicitação: o saldo cai; recusa outra: não muda")
test("funcionária vê só as próprias solicitações, sem os botões de decidir")
test("perda por vencimento só aparece para lote vencido")
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
  - **Formulário "Perda ou ajuste"**, para todos, com os campos:
    - Lote (`select`), que some no produto sem validade;
    - Tipo, com as opções Perda por avaria, Perda por vencimento (só quando o lote escolhido está vencido), Quebra de pesagem (só produto por peso), Ajuste: entrou e Ajuste: saiu;
    - Quantidade e "Em";
    - Motivo.

    O app manda a quantidade com o sinal certo: negativa nas perdas e na saída.
  - **`/estoque/solicitacoes`:**
    - tabela com Data, Produto e variação, Lote, Tipo, Quantidade, Motivo, Pedido por e Situação;
    - "Aprovar" e "Recusar" só para o administrador, nas pendentes.
  - **Link:** "Solicitações" no topo de `/estoque`.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona perdas, ajustes e solicitações na tela`.

### Task 10: App: extrato e estorno

**Arquivos:**
- Criar:
  - `src/app/(painel)/estoque/movimentacoes/page.tsx`
  - `src/app/(painel)/estoque/movimentacoes/acoes.ts`
  - `src/app/(painel)/estoque/movimentacoes/botao-estornar.tsx`
- Modificar: `e2e/estoque-perdas.spec.ts`

**Interfaces:**
- Consome: a view `extrato_movimentacoes` e `estornar_movimentacao` (Task 4).
- Produz: `estornar(id: number, motivo: string): Promise<{ erro: string; sucesso: string }>`.

- [ ] **Passo 1: escrever os testes de tela que falham.**

```ts
test("extrato filtra por tipo e por período, e mostra quem fez")
test("administrador estorna uma entrada: o saldo volta e a linha fica Estornada, sem botão")  // 'Estorno registrado.'
test("estorno que deixaria o saldo negativo mostra a mensagem")
test("funcionária vê o extrato sem o botão Estornar")
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
  - **Filtros** (formulário GET): Tipo, De, Até e `variacao` (vindo da página da variação). As datas são de São Paulo: `De` às 00:00 e `Até` até o fim do dia.
  - **Lista:** 50 por página, mais recentes primeiro, com Data e hora, Produto e variação, Lote, Tipo, Quantidade (com sinal e unidade), Motivo, Feito por e "Estornada" quando for o caso.
  - **"Estornar"** (só administrador, só em movimentação que não é estorno nem foi estornada): abre um campo de motivo e confirma.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona o extrato e o estorno de movimentações`.

### Task 11: App: alertas e avisos do Início

**Arquivos:**
- Criar: `src/app/(painel)/alertas/page.tsx`, `e2e/estoque-alertas.spec.ts`
- Modificar:
  - `src/app/(painel)/inicio/page.tsx`
  - `e2e/apoio/banco.ts`, com `rodarConferencia(): Promise<void>` e `alterarSaldoDireto(loteId: string, diferenca: number): Promise<void>` (simula uma divergência)

**Interfaces:**
- Consome: `alertas_estoque()` e `avisos_inicio()` (Task 6).

- [ ] **Passo 1: escrever os testes de tela que falham.**

```ts
test("alertas: lote vencendo em 5 dias na faixa de 7, vencido com saldo e variação abaixo do mínimo")
test("Início mostra as contagens com links para os alertas; sem nada, 'Nenhum aviso.'")
test("administrador vê solicitações pendentes e a conferência com diferença; funcionária não vê a conferência")
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
  - **`/alertas`:** três seções:
    - "Vencendo", agrupada pela faixa: até 7, 15 e 30 dias;
    - "Vencidos com saldo";
    - "Abaixo do estoque mínimo".

    Cada linha leva à página da variação.
  - **Início:**
    - uma linha por aviso com contagem maior que zero, com os textos da tabela;
    - a conferência só aparece quando a última verificação tem divergência.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona alertas de estoque e avisos no Início`.

### Task 12: Manual e fechamento

**Arquivos:**
- Criar: `docs/manual/estoque.md`
- Modificar: `README.md` (situação e link do manual)

- [ ] **Passo 1:** escrever o manual em português simples, com os textos exatos dos botões. Ele cobre:
  - saldo e lotes;
  - entrada manual (custo obrigatório; brinde a 0,00);
  - perda ou ajuste e o limite da funcionária;
  - solicitações;
  - extrato e estorno;
  - alertas e o que fazer com um lote vencido;
  - a conferência diária e o que fazer se ela achar diferença.
- [ ] **Passo 2:** rodar `npm test && npm run lint && npm run typecheck && npm run build` e confirmar que o CI ficou verde, com todos os testes de banco, de concorrência e de tela.
- [ ] **Passo 3:** commit com `Adiciona o manual do estoque`.
- [ ] **Passo 4:** fazer a revisão final do branch inteiro. Depois, com a aprovação do usuário, juntar no `main` e conferir o site principal.
