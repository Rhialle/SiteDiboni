# Plano 2.1: caixa e venda no balcão — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o balcão registra cada venda no computador (leitor ou busca, preço do catálogo, desconto, pagamento com troco), tira do estoque pelo vencimento, nunca deixa saldo negativo (venda sem saldo com aviso) e abre/fecha o caixa com conferência às cegas.

**Architecture:** como na fase 1, toda gravação é uma função do banco (plpgsql, `security definer`, tudo ou nada, travas na ordem da R10) chamada pelas ações do Next; as telas leem por funções de consulta e tabelas com RLS. A tela de venda calcula o carrinho com um módulo puro (o mesmo cálculo de `src/lib/catalogo/preco.ts`), e o banco recalcula e recusa se o total não bater.

**Tech Stack:** Supabase/Postgres (pgTAP), Next.js 16.4 (Server Components + Server Actions, padrão da etapa 1 e 2 da fluidez), Vitest, Playwright e os testes de concorrência (`concorrencia/`, só no GitHub).

**Spec:** [docs/superpowers/specs/2026-11-22-fase-2-balcao-design.md](../specs/2026-11-22-fase-2-balcao-design.md) — seções 6 a 10 (2.1).

## Global Constraints

- Convenções de dados da fase 1: dinheiro em centavos (inteiro), quantidade inteira na unidade base, custo `numeric(14,6)`, fuso `America/Sao_Paulo`, arredondamento ao centavo com meio para cima.
- RLS em todas as tabelas novas; o usuário logado não insere, altera nem apaga direto: só pelas funções.
- Nada se apaga: cancelamento é estorno (R2); saldo nunca negativo (R1); travas por `travar_saldos` com todas as variações da venda, ordenadas (R10).
- A funcionária nunca lê custo nem o esperado de um caixa antes de fechá-lo.
- Textos de tela e de erro em português, guardados em `src/lib/mensagens.ts` (os do app) ou na função do banco (os que só o banco dá).
- Telas novas: página síncrona com `<Suspense fallback={<Moldura…/>}>` em volta do componente async, e as consultas no mesmo `Promise.all` que `exigirUsuario()`/`exigirAdministrador()` (padrão das etapas 1 e 2 da fluidez); visual do DESIGN.md.
- Migrações novas a partir de `20261123120000_…`; `ALTER TYPE … ADD VALUE` numa migração só dele, antes das que usam o valor.
- Ramo `fase-2-1-caixa-e-venda`, saindo do `main`. Nada no `main` sem o OK do usuário.
- Testes de banco, concorrência e tela só no GitHub; tipos do banco do artefato `tipos-do-banco`.

### Mensagens fixadas (usadas nos testes)

| Situação | Texto |
|---|---|
| segundo caixa | `Já existe um caixa aberto.` |
| vender sem caixa | `Abra o caixa antes de vender.` |
| total diferente do calculado | `O total da venda mudou: confira os preços e tente de novo.` |
| desconto da funcionária acima do limite | `Desconto acima de {n}%: só o administrador pode dar.` |
| soma dos pagamentos | `A soma dos pagamentos não bate com o total.` |
| troco fora do dinheiro | `Só o pagamento em dinheiro tem troco.` |
| dinheiro recebido menor que a parte | `O valor recebido em dinheiro é menor que o valor a pagar.` |
| sem validade para criar lote | `Informe a validade da embalagem de {produto} – {variação}.` |
| forma/variação/produto inativo | `{produto} – {variação} não está à venda.` |
| cancelar de novo | `Esta venda já foi cancelada.` |
| estorno avulso de venda | `Movimentação de venda só sai pelo cancelamento da venda.` |
| fechar sem dinheiro contado | `Informe o dinheiro contado na gaveta.` |
| sem caixa aberto para movimento/fechamento | `Não há caixa aberto.` |
| permissões | `Você não tem permissão para acessar esta página.` (o mesmo da fase 1) |
| aviso de lote vencido (tela) | `O estoque deste produto no sistema está vencido. Confira a validade na embalagem.` |
| comprovante | `Não é documento fiscal` |

## Review Focus

1. **Bipar duas vezes o mesmo item** soma a quantidade na mesma linha, inclusive quando a linha já está com outra forma escolhida — só soma se for a mesma forma; outra forma vira outra linha. Teste unitário na Task 4.
2. **Venda de granel com saldo parcial em lotes vencidos e válidos:** sai só dos válidos, e só a falta além deles entra como venda sem saldo. Teste de banco na Task 3.
3. **Cancelar uma venda que teve venda sem saldo:** estorna primeiro as saídas e depois as entradas, e o saldo volta exatamente ao de antes da venda. Teste de banco na Task 3.
4. **Fechar o caixa com uma venda cancelada nele:** a venda cancelada não entra no esperado. Teste de banco na Task 3.
5. **Venda em andamento guardada no navegador** volta depois de recarregar a página (troca de login), e some depois de concluir. Teste de tela na Task 6.

---

### Task 1: Tipos novos e a estrutura do caixa

**Files:**
- Create: `supabase/migrations/20261123120000_balcao_tipos.sql`, `supabase/migrations/20261123130000_balcao_caixa.sql`, `supabase/tests/database/26_balcao_caixa.test.sql`
- Modify: `src/lib/supabase/tipos.ts` (artefato)

**Interfaces:**
- Produces (banco):
  - tipos: `tipo_movimentacao` + `'venda'`, `'entrada_venda_sem_saldo'`; `situacao_caixa` (`aberto`, `fechado`); `situacao_venda` (`concluida`, `cancelada`); `forma_pagamento` (`dinheiro`, `cartao_credito`, `cartao_debito`, `pix`); `tipo_movimento_caixa` (`retirada`, `reforco`).
  - `configuracoes.limite_desconto_percentual integer not null default 10 check (0..100)`, `configuracoes.largura_cupom_mm integer not null default 80 check (in (58, 80))`.
  - tabelas `caixas` (spec seção 7, com `esperado_*`/`informado_*` por forma e `conferido_por/_em`; índice único parcial em `situacao = 'aberto'`) e `caixa_movimentos`; **só o administrador lê** as duas (RLS `eh_administrador()`).
  - `abrir_caixa(p_troco_inicial_centavos integer) returns bigint`
  - `registrar_movimento_caixa(p_tipo public.tipo_movimento_caixa, p_valor_centavos integer, p_motivo text) returns bigint` (no caixa aberto)
  - `caixa_aberto() returns table (id bigint, aberto_em timestamptz, aberto_por text, troco_inicial_centavos integer, vendas integer, movimentos jsonb)` — sem esperado; qualquer usuário ativo; zero linhas sem caixa aberto.
  - `fechar_caixa(p_dinheiro_centavos integer, p_credito_centavos integer default null, p_debito_centavos integer default null, p_pix_centavos integer default null) returns table (forma public.forma_pagamento, esperado_centavos integer, informado_centavos integer, diferenca_centavos integer)` — a diferença é nula quando o informado é nulo.
  - `resumo_fechamento(p_caixa bigint)` com as mesmas colunas, para o administrador ou para quem fechou aquele caixa.
  - `conferir_caixa(p_caixa bigint) returns void` (administrador).
  - `caixas_fechados() returns table (id bigint, aberto_em timestamptz, fechado_em timestamptz, diferenca_dinheiro_centavos integer, conferido boolean)` — o administrador vê todos; os outros, só os que eles fecharam; mais recentes primeiro, até 100.
  - O esperado do dinheiro usa as vendas da Task 3; nesta task, a função já soma `venda_pagamentos` se a tabela existir — **ruling do plano:** criar aqui as tabelas `vendas` e `venda_pagamentos` vazias seria acoplar; em vez disso, `fechar_caixa` é escrita nesta task só com troco + reforços − retiradas, e a Task 3 a recria com as vendas (um teste da Task 3 cobre).

- [ ] **Step 1: Teste de banco `26_balcao_caixa.test.sql`** (estilo de `23_inventario_contagem.test.sql`): abrir com R$ 50,00 → `caixa_aberto()` devolve 1 linha com `troco_inicial_centavos = 5000`; segundo `abrir_caixa` → `Já existe um caixa aberto.`; troco negativo → recusado; reforço de 2000 e retirada de 1500 com motivo; retirada sem motivo → recusada; `fechar_caixa(5400)` → dinheiro esperado 5500, informado 5400, diferença −100; crédito/débito/Pix com esperado 0 e informado/diferença nulos; `fechar_caixa` de novo → `Não há caixa aberto.`; `fechar_caixa(null)` com caixa aberto → `Informe o dinheiro contado na gaveta.`; a funcionária lê `caixa_aberto()` mas não `select * from caixas` (0 linhas) nem `resumo_fechamento` de caixa que ela não fechou; `conferir_caixa` pela funcionária → permissão; `configuracoes.limite_desconto_percentual = 10` e `largura_cupom_mm = 80` por padrão.
- [ ] **Step 2:** commit e envio; esperado no CI: 26 falha (função inexistente).
- [ ] **Step 3:** migrações (tipos numa, estrutura e funções na outra), com `historico_cadastro` cobrindo os campos novos de `configuracoes` (o gatilho já existe na tabela).
- [ ] **Step 4:** commit e envio; banco verde; tipos do artefato num commit à parte.

### Task 2: Código de barras na forma de venda

**Files:**
- Create: `supabase/migrations/20261123140000_formas_codigo_barras.sql`, `supabase/tests/database/27_formas_codigo_barras.test.sql`
- Modify: `src/app/(painel)/produtos/[id]/formas-venda.tsx`, `src/app/(painel)/produtos/[id]/acoes.ts`, `src/lib/planilha/colunas.ts` (`COLUNAS_FORMAS` + `"Código de barras"` no fim), `src/lib/planilha/ler.ts`, `src/lib/planilha/escrever.ts`, `src/lib/planilha/conferir.ts`, a importação/exportação da planilha no banco (`planilha_importacao`/`planilha_exportacao`: recriar as funções com o campo), os testes da planilha e `e2e/produtos.spec.ts`

**Interfaces:**
- Produces: `formas_venda.codigo_barras text` opcional, GTIN válido (`gtin_valido` da fase 1), **único entre formas e variações** (um código só aponta para uma coisa): índice único em `formas_venda.codigo_barras` e gatilho nas duas tabelas que recusa código já usado na outra, com a mensagem nova `Este código de barras já está em outra variação ou forma de venda.` (em `MENSAGENS.codigoBarrasEmUso` e no mapa de `src/lib/catalogo/erros.ts`).

- [ ] **Step 1: Testes:** banco — forma com GTIN válido grava; inválido → recusado pelo check (na tela, `Código de barras inválido.`, o texto da variação); o mesmo código numa variação e numa forma, nos dois sentidos → `Este código de barras já está em outra variação ou forma de venda.`; unitários da planilha — a coluna nova lida e escrita, vazia apaga (regra "a planilha manda"); tela — na ficha, preencher o código do "Pacote com 100" e salvar mostra o código.
- [ ] **Step 2:** ver falhar (CI e local); implementar; ver passar. A coluna nova vai no fim da aba **Formas de venda** para não mudar a posição das outras.
- [ ] **Step 3:** atualizar `docs/manual/cadastrar-produto.md` e `docs/manual/planilha-do-catalogo.md` (o código do pacote). Commit e envio; CI verde.

### Task 3: A venda no banco

**Files:**
- Create: `supabase/migrations/20261123150000_balcao_venda.sql`, `supabase/tests/database/28_balcao_venda.test.sql`, `concorrencia/venda.test.ts`
- Modify: `src/lib/supabase/tipos.ts` (artefato)

**Interfaces:**
- Consumes: Task 1 (caixa, tipos), Task 2 (`formas_venda.codigo_barras`), fase 1 (`retirar_fefo`, `entrar_no_estoque`, `movimentar_lote`, `travar_saldos`, `lote_geral`, `gerar_codigo_lote`, `estornar_movimentacao`).
- Produces:
  - tabelas `vendas` (com `numero bigint` de uma sequência própria), `venda_itens`, `venda_pagamentos` (spec seção 7); **todo usuário ativo lê** as três; custo só em `movimentacoes_custos`.
  - `buscar_para_venda(p_termo text) returns table (variacao_id uuid, produto text, variacao text, codigo_interno text, tipo_venda public.tipo_venda, controla_validade boolean, disponivel bigint, so_vencido boolean, forma_exata uuid, formas jsonb)` — `forma_exata` preenchida quando o termo é o código de barras de uma forma; `formas` = formas ativas com `id, nome, fator, preco_centavos, peso_variavel, codigo_barras, faixas[]`; código exato (de forma, de variação ou interno) devolve só aquela variação; outro texto busca por nome sem acento, até 20, só produtos não inativos e variações ativas.
  - `registrar_venda(p_itens jsonb, p_desconto_centavos integer, p_pagamentos jsonb, p_total_centavos integer) returns table (venda_id bigint, numero bigint, troco_centavos integer)`
    - `p_itens`: `[{ "forma_venda_id": uuid, "quantidade": int, "validade_sem_saldo": "AAAA-MM-DD" | null }]` (quantidade em formas; em gramas no granel);
    - `p_pagamentos`: `[{ "forma": forma_pagamento, "valor_centavos": int, "recebido_centavos": int | null }]` (recebido só no dinheiro; troco = recebido − valor);
    - recalcula cada linha com as faixas (mesma regra de `precoUnitario`) e o granel (`round(preco_kg × gramas / 1000)`, meio para cima); `subtotal − desconto` tem de ser `p_total_centavos`;
    - desconto do não administrador ≤ `round(subtotal × limite / 100)`;
    - trava `travar_saldos` com todas as variações, ordenadas, antes de qualquer saída; para cada linha: disponível não vencido ≥ base → `retirar_fefo(..., 'venda', 'Venda nº {numero}', auth.uid(), 'venda', venda_id::text)`; senão, entra a falta (`entrar_no_estoque(..., 'entrada_venda_sem_saldo', 'Venda sem saldo nº {numero}', ...)`) no lote da V7 (`GERAL`; ou o não vencido de validade mais distante; ou `VSS-AAAA-MM-DD` com a validade do item, recusando sem ela) e depois `retirar_fefo`; custo da entrada = custo médio (ou nulo, sem mudar o custo médio); grava `quantidade_sem_saldo_base`;
    - cada saída grava o custo médio do momento em `movimentacoes_custos`.
  - `cancelar_venda(p_venda bigint, p_motivo text) returns void` (administrador): estorna as saídas e depois as entradas, marca `cancelada`. `estornar_movimentacao` passa a recusar `venda` e `entrada_venda_sem_saldo` fora de `cancelar_venda` (marcador da transação `set_config('diboni.cancelando_venda', 'sim', true)`).
  - `vendas_sem_saldo() returns table (item_id bigint, numero bigint, vendida_em timestamptz, produto text, variacao text, quantidade_sem_saldo_base bigint, tipo_venda public.tipo_venda)` (administrador, só os não conferidos) e `conferir_venda_sem_saldo(p_item bigint) returns void`.
  - `fechar_caixa` recriada somando as partes das vendas `concluida` do caixa (dinheiro = valor − troco já é o valor da parte; o recebido não entra).

- [ ] **Step 1: Teste de banco `28_balcao_venda.test.sql`** com estes casos (valores da spec seção 9): sem caixa → `Abra o caixa antes de vender.`; Forminha "Pacote com 100" R$ 15,00 com faixa a partir de 3 a R$ 13,50, 3 pacotes → total 4050 e saída de 300 un; `p_total_centavos` 4051 → `O total da venda mudou…` e nada gravado; granel R$ 40,00/kg, 350 g → 1400, saída 200 g do lote que vence antes e 150 g do seguinte; granel com 100 g válidos, 50 g vencidos e venda de 300 g → saem 100 g do válido, entra 200 g sem saldo, nada sai do vencido; saldo 2 e venda de 5 un → `entrada_venda_sem_saldo` de 3, saída de 5, saldo 0, item em `vendas_sem_saldo()`; produto com validade sem lote válido e sem `validade_sem_saldo` → `Informe a validade da embalagem de …`; com ela → lote `VSS-<hoje>`; desconto de 11% pela funcionária → `Desconto acima de 10%: …`; 11% pelo administrador → aceito; pagamentos somando menos → `A soma dos pagamentos…`; `recebido_centavos` num Pix → `Só o pagamento em dinheiro tem troco.`; dinheiro 5000 recebido para 4050 → troco 950; Pix 2000 + dinheiro 2050 → aceito; forma inativa → `… não está à venda.`; `cancelar_venda` da venda com sem saldo → saldo igual ao de antes, `vendas_sem_saldo()` sem o item; cancelar de novo → `Esta venda já foi cancelada.`; funcionária cancelando → permissão; `estornar_movimentacao` de uma movimentação `venda` → `Movimentação de venda só sai pelo cancelamento da venda.`; `fechar_caixa` com vendas em dinheiro (com troco), crédito e uma cancelada → esperado certo e a cancelada fora; a funcionária não lê `movimentacoes_custos` da venda; `buscar_para_venda` pelo código da forma → `forma_exata` preenchida; pelo código da variação → a variação; por "forminha" → por nome; `numero` sequencial.
- [ ] **Step 2: Teste de concorrência `concorrencia/venda.test.ts`** (estilo de `concorrencia/estoque.test.ts`): saldo 1; duas conexões vendem 1 un ao mesmo tempo → as duas concluem, uma com `quantidade_sem_saldo_base = 1`; saldo final 0; nenhuma trava eterna (`esperarTerminarOuTravar`).
- [ ] **Step 3:** commit e envio; esperado: 28 e a concorrência falham (funções inexistentes).
- [ ] **Step 4:** migração; commit e envio; banco e concorrência verdes; tipos do artefato.

### Task 4: Cálculo do carrinho na tela

**Files:**
- Create: `src/lib/balcao/carrinho.ts`, `src/lib/balcao/carrinho.test.ts`

**Interfaces:**
- Consumes: `precoUnitario`, `precoTotal`, `precoPorPeso`, `FormaComFaixas` de `src/lib/catalogo/preco.ts`.
- Produces:
  - `type LinhaDoCarrinho = { formaVendaId: string; variacaoId: string; nome: string; forma: FormaComFaixas & { nome: string; fator: number; pesoVariavel: boolean }; quantidade: number; validadeSemSaldo: string | null }`
  - `adicionar(linhas: LinhaDoCarrinho[], nova: LinhaDoCarrinho): LinhaDoCarrinho[]` — mesma `formaVendaId` soma a quantidade; outra forma é outra linha.
  - `totalDaLinha(linha): number`, `subtotal(linhas): number`
  - `descontoEmCentavos(subtotal: number, desconto: { tipo: "reais" | "percentual"; valor: number }): number` — percentual arredondado ao centavo, nunca acima do subtotal.
  - `troco(valorCentavos: number, recebidoCentavos: number): number`
  - `paraEnvio(linhas, desconto, pagamentos)` → os JSON de `registrar_venda` (Task 3).

- [ ] **Step 1: Testes** com os mesmos números da Task 3: 3 × "Pacote com 100" com faixa → 4050; granel 350 g a R$ 40/kg → 1400; bipar duas vezes a mesma forma → uma linha com quantidade 2; mesma variação em forma diferente → duas linhas; 10% de 4050 → 405; 33,333…% arredondado; desconto em reais maior que o subtotal → o subtotal; troco 5000 − 4050 → 950.
- [ ] **Step 2:** ver falhar; implementar; ver passar; `npm test`, lint, tipos. Commit.

### Task 5: Tela do caixa

**Files:**
- Create: `src/app/(painel)/caixa/page.tsx`, `src/app/(painel)/caixa/acoes.ts`, `src/app/(painel)/caixa/abrir-caixa.tsx`, `src/app/(painel)/caixa/movimento-caixa.tsx`, `src/app/(painel)/caixa/fechar-caixa.tsx`, `src/app/(painel)/caixa/[id]/page.tsx`, `e2e/caixa.spec.ts`, `e2e/apoio/balcao.ts`
- Modify: `src/components/painel/navegacao.ts` (ícones `balcao`, `caixa`, `vendas`), `src/app/(painel)/layout.tsx` (menu: Balcão, Caixa, Vendas no grupo principal, logo depois de Início), `src/lib/mensagens.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `e2e/apoio/balcao.ts` com `abrirCaixaTeste(trocoCentavos: number, usuarioId: string): Promise<number>` e `limparBalcao(): Promise<void>` (direto no banco, como `e2e/apoio/banco.ts`).

- [ ] **Step 1: Testes de tela:** sem caixa, **Caixa** mostra **Abrir caixa** com o campo **Troco inicial**; abrir com 50,00 mostra "Caixa aberto" e o troco; registrar retirada de 15,00 com motivo e reforço de 20,00 aparecem na lista; **Fechar caixa** pede **Dinheiro contado** (e crédito, débito, Pix opcionais) **sem mostrar o esperado**; depois de fechar, aparece o resumo com esperado 55,00, contado 54,00 e diferença −1,00; o administrador vê o caixa fechado com diferença e **Marcar como conferido**; a funcionária vê na lista de **Caixas fechados** só os que ela fechou e não vê o botão; o menu tem Balcão, Caixa e Vendas.
- [ ] **Step 2:** ver falhar (CI); implementar; ver passar. Commit e envio.

### Task 6: Tela de venda

**Files:**
- Create: `src/app/(painel)/balcao/page.tsx`, `src/app/(painel)/balcao/venda.tsx` (componente de cliente), `src/app/(painel)/balcao/acoes.ts`, `src/app/(painel)/vendas/[numero]/comprovante/page.tsx`, `e2e/balcao.spec.ts`
- Modify: `src/lib/mensagens.ts`

**Interfaces:**
- Consumes: Tasks 3, 4 e 5 (`caixa_aberto`, `buscar_para_venda`, `registrar_venda`, `carrinho.ts`).
- Produces: as ações `buscarParaVenda(termo: string)` e `concluirVenda(envio)` (retorna `{ numero, troco } | { erro }`).

- [ ] **Step 1: Testes de tela** (o leitor é simulado digitando o código no campo **Código ou nome** e Enter): sem caixa aberto, **Balcão** mostra **Abrir caixa** (link ou o mesmo formulário); bipar o código da variação → linha "Forminha – N4", quantidade 1; bipar de novo → quantidade 2; bipar o código do "Pacote com 100" → linha nova na forma Pacote; buscar "forminha" e Enter na lista → item; granel pede **Gramas**; com 3 pacotes aparece a faixa e o total R$ 40,50; **Receber** em dinheiro com **Recebido** 50,00 → **Troco R$ 9,50** e, ao concluir, "Venda nº 1" e **Imprimir comprovante**; venda dividida Pix 20,00 + dinheiro 20,50; desconto de 11% pela funcionária → a mensagem do limite; venda de 5 com saldo 2 → aviso de venda sem saldo na linha e a venda conclui; produto só com lote vencido → o aviso de lote vencido e pedido de confirmação; recarregar a página no meio da venda → os itens voltam; depois de concluir, recarregar → venda vazia; o comprovante mostra "Não é documento fiscal", os itens e o troco, na largura de 80 mm.
- [ ] **Step 2:** ver falhar; implementar:
  - campo com foco permanente (volta ao campo depois de cada ação); atalhos **F2** Receber e **Esc** fecha o pagamento;
  - venda em andamento no `localStorage` (`diboni:venda-em-andamento`), com `try/catch` em toda leitura e escrita, apagada ao concluir ou ao descartar (botão **Descartar venda**, com confirmação);
  - comprovante com `@page { size: <largura>mm auto; margin: 0 }`, sem cores, botão **Imprimir** que chama `window.print()`.
- [ ] **Step 3:** ver passar. Commit e envio; CI verde.

### Task 7: Vendas, vendas sem saldo, Início e Configurações

**Files:**
- Create: `src/app/(painel)/vendas/page.tsx`, `src/app/(painel)/vendas/[numero]/page.tsx`, `src/app/(painel)/vendas/[numero]/cancelar-venda.tsx`, `src/app/(painel)/vendas/acoes.ts`, `src/app/(painel)/vendas/sem-saldo/page.tsx`, `supabase/migrations/20261123160000_balcao_avisos.sql`, `e2e/vendas.spec.ts`
- Modify: `src/app/(painel)/inicio/page.tsx`, `src/lib/mensagens.ts` (`avisosDoInicio`, `ContagensDoInicio`), `src/app/(painel)/configuracoes/formulario-configuracoes.tsx`, `src/app/(painel)/configuracoes/acoes.ts`, `src/lib/supabase/tipos.ts`

**Interfaces:**
- Consumes: Task 3 (`cancelar_venda`, `vendas_sem_saldo`, `conferir_venda_sem_saldo`), Task 1 (`conferir_caixa`).
- Produces: `avisos_inicio()` recriada com mais `vendas_sem_saldo integer`, `caixas_com_diferenca integer` (só para o administrador; 0 para a funcionária) e `caixa_aberto_desde timestamptz`.

- [ ] **Step 1: Testes:** banco — `avisos_inicio()` conta vendas sem saldo não conferidas e caixas fechados com diferença não conferidos (administrador), e o caixa aberto há mais de um dia; unitário — `avisosDoInicio` monta as cartas novas ("1 venda sem saldo a conferir", "1 caixa com diferença", "Caixa aberto desde dd/mm"); tela — **Vendas** lista a venda do dia com número, hora, total e pagamento; o detalhe mostra itens, pagamentos e saídas por lote, e o custo só para o administrador; **Cancelar venda** (administrador, com motivo e confirmação) → "Venda cancelada." e o estoque volta; a funcionária não vê o botão; **Vendas sem saldo** lista o item e **Marcar como conferido** tira da lista; Configurações salva **Limite de desconto da funcionária (%)** e **Largura do cupom** (58 ou 80 mm).
- [ ] **Step 2:** ver falhar; implementar; ver passar. Commit e envio; CI verde.

### Task 8: Manual e registro

**Files:**
- Create: `docs/manual/balcao.md`, `docs/superpowers/plans/2026-11-22-fase-2-1-caixa-e-venda-registro.md`
- Modify: `README.md` (situação da fase 2: "Em construção: 2.1"; manual novo na lista)

- [ ] **Step 1:** manual (spec seção 10): abrir o caixa; vender (leitor, busca, formas, granel, desconto, desconto acima do limite com o login do administrador, pagamento dividido, troco, comprovante, impressora de cupom como padrão do Windows e sem margens); venda sem saldo e a lista do administrador; retirada e reforço; fechar o caixa às cegas e o que fazer com a diferença; cancelar uma venda; internet caiu (voltar à calculadora e lançar depois).
- [ ] **Step 2:** registro no formato dos registros 1.x (evidências por tarefa, `Ruling:`, revisão final, `minor (deferred)`).
- [ ] **Step 3:** commit e envio; CI verde. Perguntar ao usuário se junta no `main`.
