# Fase 1.6: Inventário (Plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** contar o estoque e acertar o saldo pelo que foi contado. Isso inclui:
- o administrador abre o inventário com um escopo: a loja inteira, algumas categorias ou uma lista de variações;
- quem conta busca o produto pelo celular e digita em formas de venda ("3 caixas + 4 pacotes") ou em g/kg, lote por lote, **sem ver o saldo do sistema**;
- um lote que o sistema não conhece é criado na hora;
- o administrador revisa as diferenças e aprova, e o estoque recebe os ajustes, ou cancela;
- os testes de preço por peso e por faixas da seção 11, que o plano 1.3 deixou para cá.

**Arquitetura:**
- **Banco:** tabelas `inventarios`, `inventario_escopo` e `inventario_itens`, com funções como no estoque. A aprovação chama `movimentar_lote` do plano 1.3 com o tipo `ajuste_inventario`, que já existe e já pode tirar de lote vencido.
- **Ajuste:** `contado − saldo_no_momento`. O saldo é gravado na hora de cada contagem, e assim o que se moveu depois da contagem é preservado.
- **Telas:** `/inventario` (lista e abertura) e `/inventario/[id]` (contagem, revisão e resultado), com a contagem pensada primeiro para o celular.

**Tecnologia:** a mesma dos planos anteriores, sem pacote novo.

**Especificação:** [docs/superpowers/specs/2026-10-21-fase-1-base-design.md](../specs/2026-10-21-fase-1-base-design.md). Seções usadas:
- 2, critério 4 (ensaio de contagem e o tempo gasto);
- 6.3 (`inventarios` e `inventario_itens`);
- 7 (R1, R7, R8 e "Inventário");
- 8 (contar: todos; abrir, aprovar e cancelar: só o administrador);
- 10.8 (tela de inventário);
- 11 (inventário do começo ao fim; preço por peso e por faixas);
- 12 (manual: fazer um inventário).

**Fica fora deste plano:**
- a contagem oficial da loja inteira, lote por lote, que é o começo da fase 2. Este plano entrega a ferramenta e o ensaio com uma prateleira;
- leitura de código de barras pela câmera (fase 2): a busca aceita digitar o código.

## Decisões deste plano

O primeiro ponto foi decidido pelo usuário. Os outros são propostas para revisar com o plano.

1. **Contagem às cegas** (decisão de 2026-10-29): a tela de contagem não mostra o saldo do sistema, nem quanto falta ou sobra. Mostra só o que a própria contagem já registrou ("Contado: 340 un"). As diferenças aparecem só para o administrador, na revisão.
2. **Um inventário em andamento por vez:** só um pode estar em contagem ou em revisão. Assim dois inventários nunca ajustam o mesmo item.
3. **Situações:** **Em contagem** (`aberto`) → **Em revisão** (`em_revisao`, o administrador encerrou a contagem) → **Aprovado** ou **Cancelado**. Em revisão, o administrador pode **voltar a contar**. Cancelar vale em contagem ou em revisão e não muda nada no estoque.
4. **Escopo por categorias:** inclui as subcategorias, como o filtro de produtos. **Por variações:** o administrador cola os códigos internos, um por linha.
5. **O item contado é o lote:**
   - produto sem controle de validade: conta-se a variação (o lote geral dela);
   - produto com validade: conta-se cada lote, pelo código e pela validade.
   - Contar de novo o mesmo lote substitui a contagem anterior e grava de novo o saldo do momento.
6. **Lote que não está na lista:** quem conta informa a **validade** (obrigatória) e o **código** (opcional; vazio gera `INV-AAAA-MM-DD`, com `-2`, `-3`… como na R7). O lote é criado com saldo zero na hora da contagem.
7. **Digitar a contagem:** um campo por unidade de contagem (**unidade(s)** e cada forma de venda ativa; no produto por peso, **g** e **kg** com até 3 casas), e o total é a soma. Pelo menos um campo é preenchido; para zerar, conta-se **0** de forma explícita.
8. **Tempo gasto (critério 4):** a revisão e o resultado mostram a primeira e a última contagem e quantos itens foram contados.
9. **Aprovação que esbarra na R1:** se o ajuste de um item deixaria o saldo negativo (o estoque baixou depois da contagem), a aprovação inteira é desfeita e a mensagem mostra o item. O administrador pode voltar a contar aquele item.
10. **Valor na revisão:** o administrador vê o valor de cada diferença (`|diferença| × custo médio`, como na R8). Uma variação sem custo médio mostra "sem custo".

## Restrições globais

- **O que já vale:** tudo o que os planos 1.1 a 1.5 definiram: português do Brasil, fuso de São Paulo, RLS em toda tabela, `anon` sem acesso, administrador com `aal2`, `set search_path = ''`, funções internas com `revoke execute ... from public, anon, authenticated`, ninguém grava direto nas tabelas (`revoke insert, update, delete, truncate`).
- **Next.js 16:** antes de escrever rota, página ou ação nova, ler o guia em `node_modules/next/dist/docs/` (`AGENTS.md`).
- **Quantidades:** `bigint` na unidade base (un ou g), como no plano 1.3. A conversão das formas usa `unidadesDeDigitacao` e `paraUnidadeBase` de `src/lib/estoque/quantidade.ts`.
- **R10:** a aprovação trava os saldos em ordem de `lote_id` (`travar_saldos`), antes de ajustar.
- **Permissões:** ler inventários e itens: `eh_usuario_ativo()`; o saldo do momento e as diferenças só saem pela função de revisão, que exige administrador; contar: usuário ativo; abrir, encerrar, voltar a contar, aprovar e cancelar: administrador.
- **Testes:** pgTAP, Playwright e concorrência no CI; unitários no computador. Os testes que falham da Task N+1 vão no mesmo envio da implementação da Task N. A limpeza dos testes (`e2e/apoio/banco.ts` e `concorrencia/apoio.ts`) passa a apagar as tabelas do inventário antes das do estoque.

## Textos fixos da interface

| Situação | Texto |
|---|---|
| Situações na tela | `Em contagem`, `Em revisão`, `Aprovado`, `Cancelado` |
| Inventário aberto | `Inventário aberto.` |
| Já há um em andamento | `Já existe um inventário em andamento: termine ou cancele antes de abrir outro.` |
| Escopo vazio (categorias) | `Escolha pelo menos uma categoria.` |
| Escopo vazio (variações) | `Informe pelo menos um código interno.` |
| Código que não existe | `Código interno não encontrado: {códigos}.` |
| Contagem salva | `Contagem salva.` |
| Fora de contagem | `Este inventário não está mais em contagem.` |
| Fora de revisão (aprovar ou voltar a contar) | `Este inventário não está mais em revisão.` |
| Fora do escopo | `Este item não está no escopo do inventário.` |
| Nada digitado | `Informe a quantidade contada (0 se não há nenhum).` |
| Campo inválido | `{unidade}: use um número inteiro (em kg, até 3 casas).` |
| Lote sem validade | `Informe a validade do lote.` |
| Lote repetido com outra validade | `O lote {código} já existe com validade {dd/mm/aaaa}.` (o texto da R7, que já existe) |
| Contagem encerrada | `Contagem encerrada: confira as diferenças.` |
| Contagem reaberta | `Contagem reaberta.` |
| Aprovado | `Inventário aprovado: {n} ajuste(s) no estoque.` |
| Aprovação recusada (R1) | `{produto} – {variação} (lote {código}): o ajuste de {diferença} deixaria o saldo negativo (há {saldo} agora). Nada foi ajustado.` |
| Cancelado | `Inventário cancelado.` |
| Lista vazia | `Nenhum inventário.` |
| Busca sem resultado | `Nenhum item do inventário com essa busca.` |
| Motivo das movimentações | `Inventário nº {id}` |

## Pontos de atenção na revisão

1. **Movimentação depois da contagem:** uma venda ou perda entre a contagem e a aprovação não pode ser apagada pelo ajuste (Task 2 e teste de tela da Task 6).
2. **Duas pessoas contando o mesmo lote** ao mesmo tempo: fica uma contagem só, a última (Task 2, concorrência).
3. **Aprovar duas vezes** (dois cliques, duas abas): o estoque é ajustado uma vez só (Task 2, concorrência).
4. **Contagem chegando enquanto o administrador encerra ou aprova:** ela é recusada com "Este inventário não está mais em contagem." e não entra pela metade (Task 2, concorrência).
5. **A contagem às cegas não vaza o saldo:** nem na tela, nem no que a busca devolve para a funcionária (Task 2 e Task 5).

---

### Task 1: Banco: estrutura, abertura e situações

**Arquivos:**
- Criar: `supabase/migrations/<ts>_inventario_estrutura.sql`, `supabase/tests/database/22_inventario_estrutura.test.sql`
- Modificar: `e2e/apoio/banco.ts` e `concorrencia/apoio.ts` (limpeza), `src/lib/supabase/tipos.ts` (artefato do CI)

**Interfaces:**
- Produz:
  - enums `situacao_inventario ('aberto','em_revisao','aprovado','cancelado')` e `escopo_inventario ('loja','categorias','variacoes')`;
  - `inventarios(id bigint identity pk, descricao text not null, escopo escopo_inventario not null, situacao situacao_inventario not null default 'aberto', aberto_por uuid not null, aberto_em timestamptz default now(), encerrado_em timestamptz null, decidido_por uuid null, decidido_em timestamptz null)`, com índice único parcial `inventarios_um_em_andamento` em `((true)) where situacao in ('aberto','em_revisao')`;
  - `inventario_escopo(inventario_id bigint references inventarios, categoria_id uuid null references categorias, variacao_id uuid null references variacoes)`, com exatamente um dos dois preenchido;
  - `inventario_itens(id bigint identity pk, inventario_id bigint not null references inventarios, variacao_id uuid not null references variacoes, lote_id uuid not null references lotes, saldo_no_momento bigint not null, quantidade_contada bigint not null check (>= 0), contado_por uuid not null, contado_em timestamptz not null default now(), unique (inventario_id, lote_id))`;
  - `variacoes_do_inventario(p_inventario bigint) returns setof uuid` (interna): todas as variações do escopo (loja; categorias com as subcategorias; variações);
  - `abrir_inventario(p_descricao text, p_escopo escopo_inventario, p_categorias uuid[], p_codigos text[]) returns bigint` (administrador). Descrição vazia vira `Inventário de dd/mm/aaaa`; os códigos são normalizados (`normalizar_codigo_interno`), e os que não existem viram o erro com a lista;
  - `encerrar_contagem(p_inventario bigint)`, `reabrir_contagem(p_inventario bigint)` e `cancelar_inventario(p_inventario bigint)` (administrador), cada uma conferindo a situação de onde parte, com a linha do inventário travada (`for update`).

- [ ] **Passo 1: escrever o teste pgTAP que falha** (`22_inventario_estrutura`):
  - a funcionária não abre, não encerra e não cancela (`Você não tem permissão para acessar esta página.`), mas lê a lista;
  - abrir pela loja inteira; um segundo enquanto o primeiro está em contagem ou em revisão → `Já existe um inventário em andamento: termine ou cancele antes de abrir outro.`; depois de cancelado, abre de novo;
  - descrição vazia → `Inventário de dd/mm/aaaa` (data de São Paulo);
  - escopo por categoria `Bolos` inclui a variação de um produto em `Bolos > Caixas` e não inclui a de `Festa`;
  - escopo por variações com `' cx-p '` acha `CX-P`; com `XX-9` → `Código interno não encontrado: XX-9.`; listas vazias → os textos de escopo vazio;
  - situações: encerrar (contagem → revisão), reabrir (revisão → contagem), cancelar; encerrar um cancelado → `Este inventário não está mais em contagem.`;
  - ninguém grava direto em `inventarios` nem em `inventario_itens`.
- [ ] **Passo 2:** enviar e confirmar no CI que FALHA.
- [ ] **Passo 3:** implementar a migração e a limpeza dos testes.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSA; baixar os tipos do artefato.
- [ ] **Passo 5:** commit com `Adiciona a estrutura do inventário, a abertura e as situações`.

### Task 2: Banco: contagem, revisão e aprovação

**Arquivos:**
- Criar: `supabase/migrations/<ts>_inventario_contagem.sql`, `supabase/tests/database/23_inventario_contagem.test.sql`, `concorrencia/inventario.test.ts`
- Modificar: `src/lib/supabase/tipos.ts` (artefato do CI)

**Interfaces:**
- Consome: `variacoes_do_inventario` (Task 1); `lote_geral`, `gerar_codigo_lote`, `travar_saldos` e `movimentar_lote` (plano 1.3).
- Produz:
  - `itens_para_contar(p_inventario bigint, p_busca text) returns table (variacao_id uuid, produto text, variacao text, codigo_interno text, tipo_venda tipo_venda, controla_validade boolean, lotes jsonb)` (usuário ativo): até 30 variações do escopo, buscando sem acento pelo nome do produto, código interno ou código de barras. `lotes` traz `[{lote_id, codigo, validade, contado}]`, em que `contado` é a quantidade já contada neste inventário (ou nulo). **Não traz saldo** (contagem às cegas). Produto sem validade traz só o lote geral (criado se não existir). Lote com validade só aparece se já teve saldo ou já foi contado neste inventário;
  - `contar_item(p_inventario bigint, p_variacao uuid, p_lote uuid, p_quantidade bigint, p_validade date default null, p_codigo_lote text default null) returns bigint` (usuário ativo). Trava o inventário com `for share` e exige `aberto`. Exige variação do escopo. Com `p_lote` nulo: produto sem validade usa o lote geral; com validade, cria o lote com saldo zero (validade obrigatória; código vazio vira `gerar_codigo_lote(variacao, 'INV')`; código que já existe com outra validade → o texto da R7). Grava ou substitui a contagem com `saldo_no_momento` = saldo atual do lote;
  - `revisao_inventario(p_inventario bigint) returns table (lote_id uuid, produto text, variacao text, codigo_lote text, validade date, tipo_venda tipo_venda, saldo_no_momento bigint, contado bigint, diferenca bigint, valor_centavos bigint, contado_por text, contado_em timestamptz)` (administrador), em ordem de produto, variação e validade. `valor_centavos` = `round(|diferença| × custo médio × 100)`, nulo sem custo médio;
  - `resumo_inventario(p_inventario bigint) returns table (itens_contados integer, com_diferenca integer, variacoes_no_escopo integer, variacoes_contadas integer, primeira_contagem timestamptz, ultima_contagem timestamptz)` (usuário ativo; sem saldos);
  - `aprovar_inventario(p_inventario bigint) returns integer` (administrador): exige `em_revisao`; trava o inventário (`for update`) e os saldos dos lotes contados (`travar_saldos`, em ordem de `lote_id`); para cada item com diferença ≠ 0, `movimentar_lote(lote, 'ajuste_inventario', diferença, 'Inventário nº {id}', contado_por, 'inventario', id, null, administrador)`; se um ajuste esbarrar na R1, desfaz tudo com o texto da tabela. Devolve quantos ajustes fez.

- [ ] **Passo 1: escrever os testes que falham:**
  - **pgTAP** (`23_inventario_contagem`):
    - contagem de produto sem validade vai para o lote geral e grava o saldo do momento; contar de novo substitui (uma linha só) e grava o saldo novo;
    - `itens_para_contar` acha por nome sem acento ("forminha" acha "Forminha"), por código interno e por código de barras; não devolve nenhuma coluna de saldo; a funcionária recebe o mesmo;
    - lote desconhecido: sem validade → `Informe a validade do lote.`; com validade e sem código → lote `INV-AAAA-MM-DD` com saldo 0; o segundo no mesmo dia → `INV-AAAA-MM-DD-2`; código existente com outra validade → texto da R7;
    - item fora do escopo → `Este item não está no escopo do inventário.`; inventário em revisão → `Este inventário não está mais em contagem.`;
    - a funcionária não chama `revisao_inventario` nem `aprovar_inventario`;
    - **seção 7:** saldo 100, contado 90, depois uma perda de 5 (saldo 95): a aprovação ajusta −10 e o saldo fica 85 (a perda feita depois é preservada);
    - item não contado não gera ajuste; contado 0 zera; lote vencido contado com menos recebe o ajuste;
    - as movimentações saem com tipo `ajuste_inventario`, motivo `Inventário nº {id}`, `aprovado_por` o administrador; `aprovar_inventario` devolve o número de ajustes;
    - R1: saldo 10, contado 2 (ajuste −8), depois perda de 5 (saldo 5): a aprovação falha com o texto da tabela, nada muda, e o inventário continua em revisão;
    - `revisao_inventario` mostra saldo do momento, contado, diferença e valor (custo médio 0,05 e diferença −10 → 50 centavos);
    - `resumo_inventario` conta itens, diferenças e variações do escopo contadas, e traz a primeira e a última contagem.
  - **Concorrência** (`concorrencia/inventario.test.ts`):
    - duas aprovações ao mesmo tempo: uma ajusta, a outra recebe `Este inventário não está mais em revisão.` (ou espera e não ajusta de novo); o saldo muda uma vez só;
    - contagem enviada enquanto o administrador encerra a contagem: ou entra antes do encerramento, ou é recusada com `Este inventário não está mais em contagem.`; nunca fica uma contagem num inventário já em revisão;
    - duas contagens do mesmo lote ao mesmo tempo: fica uma linha só.
- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM; baixar os tipos do artefato.
- [ ] **Passo 5:** commit com `Adiciona a contagem, a revisão e a aprovação do inventário`.

### Task 3: Soma da contagem e preço por peso e por faixas

**Arquivos:**
- Criar: `src/lib/inventario/contagem.ts` e `contagem.test.ts`, `src/lib/catalogo/preco.ts` e `preco.test.ts`
- Modificar: `src/lib/mensagens.ts` (textos da tabela acima)

**Interfaces:**
- Consome: `UnidadeDeDigitacao` e `paraUnidadeBase` (`src/lib/estoque/quantidade.ts`).
- Produz:

```ts
// Os campos da contagem, um por unidade (valor da unidade → texto digitado).
somarContagem(campos: Record<string, string>, unidades: UnidadeDeDigitacao[]): { ok: true; total: number } | { ok: false; erro: string }

type FormaComFaixas = { preco_centavos: number; faixas: { quantidade_minima: number; preco_centavos: number }[] }
precoUnitario(forma: FormaComFaixas, quantidade: number): number   // centavos de cada forma, pela maior faixa alcançada
precoTotal(forma: FormaComFaixas, quantidade: number): number      // quantidade × precoUnitario
precoPorPeso(precoKgCentavos: number, gramas: number): number      // arredondado ao centavo, meio para cima
```

- [ ] **Passo 1: escrever os testes unitários que falham:**
  - `contagem.test.ts`:
    - "3 caixas + 4 pacotes": `{ "forma:cx": "3", "forma:pc": "4" }` com Caixa com 100 e Pacote com 10 → 340;
    - unidades soltas somam: `{ un: "7", "forma:cx": "1" }` → 107;
    - peso: `{ kg: "1,250", g: "30" }` → 1280;
    - `{ un: "0" }` → 0 (zero explícito vale);
    - tudo vazio → `Informe a quantidade contada (0 se não há nenhum).`;
    - `{ "forma:cx": "1,5" }` → `Caixa com 100: use um número inteiro (em kg, até 3 casas).`; `{ kg: "1,2505" }` → o mesmo texto com `kg`;
    - um campo de unidade que não existe mais (forma inativada) → `A unidade escolhida em “Em” não vale mais. Recarregue a página e confira.` (o texto que já existe).
  - `preco.test.ts`:
    - forma de R$ 6,00 com faixas a partir de 2 (R$ 5,50) e de 10 (R$ 5,00): quantidade 1 → 600; 2 → 550; 9 → 550; 10 → 500; `precoTotal` de 10 → 5000;
    - sem faixas: 3 → 600 cada, total 1800;
    - peso: R$ 32,00/kg × 250 g → 800; × 333 g → 1066 (1065,6 sobe); R$ 1,00/kg × 5 g → 1 (0,5 sobe); × 0 g → 0.
- [ ] **Passo 2:** rodar `npm test` e confirmar que FALHAM (módulos inexistentes).
- [ ] **Passo 3:** implementar. `somarContagem` usa `paraUnidadeBase` em cada campo preenchido, aceitando "0".
- [ ] **Passo 4:** rodar `npm test`, `npm run lint` e `npm run typecheck` e confirmar que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a soma da contagem e o preço por peso e por faixas`.

### Task 4: Telas: lista e abertura do inventário

**Arquivos:**
- Criar: `src/app/(painel)/inventario/page.tsx`, `src/app/(painel)/inventario/acoes.ts`, `src/app/(painel)/inventario/abrir-inventario.tsx`, `src/lib/inventario/rotulos.ts`, `e2e/inventario.spec.ts`
- Modificar: `src/app/(painel)/layout.tsx` e `src/components/painel/navegacao.ts` ("Inventário" no menu de todos, depois de "Notas", com o ícone `ClipboardList`)

**Interfaces:**
- Consome: `abrir_inventario` (Task 1).
- Produz: `abrirInventario(_estado, formData): Promise<{ erro: string; valores: Record<string, string> | null }>` — no sucesso, vai para `/inventario/{id}`; `ROTULO_SITUACAO_INVENTARIO` e `TOM_SITUACAO_INVENTARIO` (Em contagem: `atencao`; Em revisão: `marca`; Aprovado: `ok`; Cancelado: `neutro`).
- Tela: tabela "Inventários" (Nº, Descrição, Escopo, Situação, Aberto em, Aberto por), "Nenhum inventário." quando vazia. Só para o administrador, a caixa "Abrir inventário": **Descrição**, **Escopo** (Loja inteira / Categorias / Variações), as categorias como caixas de marcar (caminhos) e **Códigos internos** (um por linha), botão **Abrir inventário**.

- [ ] **Passo 1: escrever os testes de tela que falham:**

```ts
test("administrador abre inventário de uma categoria e vai para a contagem")
test("com um inventário em andamento, abrir outro mostra a mensagem")
test("funcionária vê a lista e não vê a caixa de abrir")
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a lista e a abertura do inventário`.

### Task 5: Tela: contagem pelo celular

**Arquivos:**
- Criar: `src/app/(painel)/inventario/[id]/page.tsx`, `src/app/(painel)/inventario/[id]/acoes.ts`, `src/app/(painel)/inventario/[id]/contagem.tsx`
- Modificar: `e2e/inventario.spec.ts`

**Interfaces:**
- Consome: `itens_para_contar`, `contar_item` e `resumo_inventario` (Task 2); `somarContagem` (Task 3); `unidadesDeDigitacao` e as formas de venda da variação.
- Produz: `contarItem(inventarioId: number, variacaoId: string, loteId: string | null, _estado, formData): Promise<{ erro: string; sucesso: string; valores: Record<string, string> | null }>`.
- Tela (em contagem):
  - cabeçalho com nº, descrição, situação e "N itens contados";
  - campo **Buscar** (nome, código interno ou de barras) e botão **Buscar** (formulário GET, `?q=`);
  - para cada variação achada, um bloco com o nome; produto sem validade: um formulário de contagem; com validade: um por lote (**Lote {código}, vence em {dd/mm/aaaa}**) e o formulário **Lote que não está na lista** (Validade, Código do lote (opcional));
  - cada formulário tem um campo por unidade de contagem e o botão **Salvar contagem**; depois de salvo, mostra **Contado: {quantidade}**;
  - nenhum saldo do sistema aparece;
  - para o administrador: **Encerrar contagem** e **Cancelar inventário** (com confirmação do navegador).

- [ ] **Passo 1: escrever os testes de tela que falham:**

```ts
test("funcionária conta em formas de venda: 3 caixas + 4 pacotes fica Contado: 340 un")
test("contagem às cegas: a tela de contagem não mostra o saldo do sistema")
test("lote que não está na lista: com a validade, o lote INV é criado e contado")
test("contar de novo o mesmo item substitui a contagem")
```

  - O segundo cria saldo 137 e confere que "137" não aparece em nenhum lugar visível da página de contagem.
- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar (a tela primeiro no celular: campos grandes, um bloco por variação).
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a contagem do inventário`.

### Task 6: Telas: revisão, aprovação e cancelamento

**Arquivos:**
- Criar: `src/app/(painel)/inventario/[id]/revisao.tsx`
- Modificar: `src/app/(painel)/inventario/[id]/page.tsx` e `acoes.ts`, `e2e/inventario.spec.ts`

**Interfaces:**
- Consome: `encerrar_contagem`, `reabrir_contagem`, `cancelar_inventario` (Task 1); `revisao_inventario`, `resumo_inventario`, `aprovar_inventario` (Task 2).
- Produz: `encerrarContagem(id)`, `reabrirContagem(id)`, `aprovarInventario(id)` e `cancelarInventario(id)`, cada uma `Promise<{ erro: string; sucesso: string }>`.
- Tela:
  - **Em revisão** (administrador): resumo ("{n} item(ns) contado(s), {d} com diferença; {c} de {e} variações do escopo contadas; contagem das {hh:mm} às {hh:mm} de {dd/mm}"), tabela **Diferenças** (Produto, Variação, Lote, Validade, No sistema na contagem, Contado, Diferença com sinal, Valor), e os botões **Aprovar inventário**, **Voltar a contar** e **Cancelar inventário** (com confirmação);
  - **Em revisão** (funcionária): `Em revisão pelo administrador.`;
  - **Aprovado** ou **Cancelado**: o resumo e, no aprovado, o link **Ver ajustes no extrato** (`/estoque/movimentacoes?tipo=ajuste_inventario`).

- [ ] **Passo 1: escrever os testes de tela que falham** (o primeiro é o teste de tela da seção 11):

```ts
test("inventário do começo ao fim: abre, conta, encerra, revisa e aprova; o saldo fica igual ao contado")
test("movimentação depois da contagem é preservada na aprovação")
test("aprovação que deixaria saldo negativo mostra o item e não muda nada")
test("cancelar o inventário não muda o estoque e libera abrir outro")
test("funcionária não vê diferenças nem os botões de aprovar")
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a revisão, a aprovação e o cancelamento do inventário`.

### Task 7: Manual e fechamento

**Arquivos:**
- Criar: `docs/manual/inventario.md`
- Modificar: `README.md` (situação e link do manual), `docs/manual/estoque.md` (o ajuste de inventário no extrato)

- [ ] **Passo 1:** escrever o manual em português simples, com os textos exatos dos botões. Ele cobre:
  - abrir (escopo: loja, categorias, variações) e que só um fica em andamento;
  - contar pelo celular: buscar, digitar em formas de venda ou g/kg, lote por lote, lote que não está na lista, contar de novo, contar 0 para zerar;
  - por que a contagem é às cegas;
  - encerrar, revisar as diferenças, voltar a contar, aprovar ou cancelar;
  - o que acontece com o que se moveu depois da contagem, e a mensagem do saldo negativo;
  - o ensaio de uma prateleira (critério 4): como anotar o tempo pela primeira e última contagem.
- [ ] **Passo 2:** rodar `npm test && npm run lint && npm run typecheck` e confirmar que o CI ficou verde, com todos os testes de banco, de concorrência e de tela.
- [ ] **Passo 3:** commit com `Adiciona o manual do inventário`.
- [ ] **Passo 4:** fazer a revisão final do branch inteiro. Depois, com a aprovação do usuário, juntar no `main` e conferir o site principal.
