# Fase 1.5: Planilha do catálogo (Plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** cadastrar e atualizar o catálogo inteiro por uma planilha `.xlsx`. Isso inclui:
- baixar o modelo vazio e exportar o catálogo atual no mesmo modelo;
- importar a planilha preenchida: antes, uma prévia com o que vai ser criado, atualizado e o que fica sem mudança, e os erros por aba, linha e coluna;
- a importação só acontece sem nenhum erro, e é tudo ou nada.

**Arquitetura:**
- **Leitura e escrita do `.xlsx`:** no servidor do Next, com o pacote `exceljs`. A leitura vira linhas já conferidas célula a célula (`src/lib/planilha/ler.ts`).
- **Prévia:** uma função pura (`src/lib/planilha/conferir.ts`) compara as linhas com o catálogo atual, que vem inteiro do banco numa chamada só (`catalogo_para_planilha()`). Ela conta criados, atualizados e sem mudança, acha os erros que dependem do catálogo e monta o que vai para o banco.
- **Gravação:** uma função do banco, `importar_planilha(dados jsonb)`, grava tudo numa transação só. As regras do banco (repetições, faixas, granel, tipo de venda travado) continuam valendo e desfazem tudo se algo escapar da prévia.
- **Importar depois da prévia:** o navegador guarda o arquivo e manda de novo. O servidor lê e confere outra vez antes de gravar, para não confiar numa prévia antiga.

**Tecnologia:** a mesma dos planos anteriores, mais o pacote `exceljs` (lê e escreve `.xlsx`, sem dependências nativas).

**Especificação:** [docs/superpowers/specs/2026-10-21-fase-1-base-design.md](../specs/2026-10-21-fase-1-base-design.md). Seções usadas:
- 6.1 (cadastro);
- 8 (só o administrador mexe em cadastro e planilhas);
- 9.2 (planilha);
- 10.3 (importação e exportação na tela de produtos);
- 11 (testes da leitura da planilha e das mensagens de erro);
- 12 (manual: importar e exportar a planilha).

**Fica fora deste plano:**
- inventário (plano 1.6);
- estoque e custo: a planilha nunca mexe neles (9.2);
- fotos, descrição, CEST, origem fiscal, atributos da grade e "inativo": não estão no modelo, então a planilha não muda;
- importar notas pela chave na SEFAZ (ideia em espera; ver a anotação do projeto).

## Decisões deste plano

O primeiro ponto foi decidido pelo usuário. Os outros são propostas para revisar com o plano.

1. **A planilha manda** (decisão de 2026-10-28):
   - nas variações que estão na aba **Variações**, vale o que está na planilha: célula vazia apaga o valor opcional (código de barras, NCM, medidas, categorias, materiais), S/N vazio vale N, e Estoque mínimo vazio vale 0;
   - se a variação tem linhas na aba **Formas de venda**, ela fica só com essas formas: a forma que sumiu é **desativada** (não apagada), e a faixa que sumiu é apagada;
   - variação sem linha em **Formas de venda** não tem as formas mexidas;
   - variação fora da planilha não muda.
2. **Colunas de produto em várias linhas:** Produto, NCM, Categorias, Materiais, Tipo de venda, Controla validade, Forno, Freezer, Micro-ondas e Alimento são do produto. As linhas do mesmo produto precisam trazer o mesmo valor; se não, é erro em cada linha diferente da primeira. Vale para o nome (a especificação já dizia) e para as outras colunas.
3. **Linha nova (código interno que não existe):**
   - o código interno é obrigatório;
   - Variação vazia vira "Padrão";
   - linhas novas com o mesmo Produto viram variações do mesmo produto novo;
   - se a planilha também tem linhas de variações que já existem com esse mesmo Produto, de um produto só, a linha nova entra nesse produto. É o caso de exportar, acrescentar uma linha de tamanho novo e importar de volta;
   - se esse nome é de mais de um produto que já existe, é erro.
4. **Estoque mínimo:** na unidade base, **un** ou **g**. A coluna se chama "Estoque mínimo (un ou g)".
5. **Forma de produto por peso:** exatamente uma forma, com fator 1000 e preço por kg, sem faixas. A planilha não tem a coluna "a granel": a forma de produto por peso já é gravada como granel.
6. **Formas casadas pelo nome:** dentro de uma variação, a forma é achada pelo nome, sem diferença de maiúsculas e espaços nas pontas. Para isso entra um índice único novo, com conferência de repetidos antes, sem apagar nada. Uma forma desativada com o mesmo nome volta a ficar ativa.
7. **Preço digitado como texto:** "12,50", "R$ 12,50" e "1.234,56" valem. "12.50" é erro, porque o ponto pode ser milhar. Célula de número (o normal no Excel) vale como está.
8. **Números que o Excel estraga:** NCM em célula de número perde o zero da frente (04021010 vira 4021010): completa com zeros até 8 dígitos. Código de barras em célula de número é lido como inteiro, sem notação científica. A exportação escreve essas colunas como texto.
9. **Limites:** arquivo de até 4 MB e até 5.000 linhas por aba.
10. **Linha da planilha:** os erros mostram o número da linha do Excel (a primeira linha de dados é a 2). Linhas totalmente vazias são ignoradas.
11. **Mudanças travadas pelo estoque:** mudar o tipo de venda de produto com movimentações, ou o controle de validade de produto com saldo, aparece como erro já na prévia, com o mesmo texto do banco. Mudar o tipo de venda de produto que já tem formas (mesmo desativadas) também é erro, porque o banco recusa: isso se faz na ficha.

## Restrições globais

- **O que já vale:** tudo o que os planos 1.1 a 1.4 definiram: português do Brasil, R$, fuso de São Paulo, RLS em toda tabela, `anon` sem acesso, administrador com `aal2`, `set search_path = ''` nas funções, funções internas com `revoke execute ... from public, anon, authenticated`.
- **Next.js 16:** antes de escrever rota, página ou ação nova, ler o guia em `node_modules/next/dist/docs/` (`AGENTS.md`). As rotas de download são Route Handlers (`route.ts`, `GET`); o envio da planilha passa por ação do servidor, dentro do limite de `bodySizeLimit: '4mb'` que já está no `next.config.ts`.
- **Só o administrador:** página, rotas e funções do banco exigem administrador (`exigirAdministrador()` no app e `eh_administrador()` no banco).
- **Dinheiro:** `preco_centavos` inteiro, como no plano 1.2. Na planilha, o preço é em reais.
- **Nomes das abas e colunas** (exatos, comparados sem diferença de maiúsculas, acentos iguais):
  - **Variações:** Produto, Variação, Código interno, Código de barras, NCM, Categorias, Materiais, Tipo de venda, Controla validade, Forno, Freezer, Micro-ondas, Alimento, Estoque mínimo (un ou g), Comprimento (mm), Largura (mm), Altura (mm), Capacidade (ml).
  - **Formas de venda:** Código interno, Forma, Fator, Quantidade mínima, Preço (R$).
- **Categorias na célula:** caminhos separados por `;`, e cada nível separado por `>` (ex.: `Bolos > Caixas para bolo; Festa`). **Materiais:** separados por `;`.
- **Testes:** como nos planos anteriores: pgTAP, Playwright e concorrência no CI; unitários no computador. Os testes que falham da Task N+1 vão no mesmo envio da implementação da Task N.

## Textos fixos da interface

| Situação | Texto |
|---|---|
| Arquivo que não é `.xlsx` | `Arquivo inválido: use uma planilha .xlsx (o modelo baixado do sistema).` |
| Arquivo grande | `A planilha precisa ter até 4 MB.` |
| Falta a aba | `A planilha não tem a aba “{aba}”.` |
| Falta a coluna | `A aba “{aba}” não tem a coluna “{coluna}”.` |
| Linhas demais | `Cada aba pode ter até 5.000 linhas.` |
| Célula obrigatória vazia | `Preencha este campo.` |
| S/N | `Use S ou N.` |
| Tipo de venda | `Use unidade ou peso.` |
| Inteiro maior que zero (fator, medidas, quantidade mínima) | `Use um número inteiro maior que zero.` |
| Estoque mínimo | `Use um número inteiro, zero ou mais.` |
| Preço | `Informe o preço em reais, por exemplo 6,00.` (já existe) |
| NCM e código de barras | os de hoje: `O NCM precisa ter 8 dígitos.` e `Código de barras inválido.` |
| Categoria mal escrita | `Escreva as categorias assim: Bolos > Caixas para bolo; Festa.` |
| Texto comprido demais | `Use até {n} caracteres.` |
| Código repetido na aba Variações | `Este código interno aparece em mais de uma linha.` |
| Coluna de produto diferente | `As linhas do mesmo produto precisam ter o mesmo valor nesta coluna.` |
| Nome de produto ambíguo | `Há mais de um produto com este nome: para acrescentar a variação, use a ficha do produto.` |
| Código de barras em outra variação | `Este código de barras já está em outra variação.` (já existe) |
| Forma de código que não existe | `Nenhuma variação com este código interno.` (já existe) |
| Forma sem a linha de preço normal | `Falta a linha com quantidade mínima 1 (o preço normal) desta forma.` |
| Forma e quantidade repetidas | `Esta forma com esta quantidade mínima aparece em mais de uma linha.` |
| Fatores diferentes na mesma forma | `As linhas desta forma precisam ter o mesmo fator.` |
| Faixas fora de ordem | `O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.` (já existe) |
| Produto por peso | `Produto por peso tem uma forma só, com fator 1000 e preço por kg, sem faixas.` |
| Tipo de venda com movimentações | `Não dá para mudar o tipo de venda: o produto já tem movimentações de estoque.` |
| Tipo de venda com formas | `Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele.` (já existe) |
| Validade com saldo | `Não dá para mudar o controle de validade: o produto tem estoque.` |
| Forma repetida na ficha (índice novo) | `Esta variação já tem uma forma de venda com este nome.` |
| Resumo da prévia | `{c} criado(s), {a} atualizado(s) e {s} sem mudança.` |
| Nada a fazer | `Nada a importar: a planilha é igual ao catálogo.` |
| Importada | `Planilha importada: {c} criado(s) e {a} atualizado(s).` |

"Criado" e "atualizado" contam variações. Uma variação conta como atualizada quando muda algum campo dela, do produto dela ou as formas dela.

## Pontos de atenção na revisão

1. **Exportar e importar de volta sem mexer:** tudo "sem mudança". Qualquer diferença aqui (espaço, maiúscula, zero do NCM, ordem das categorias) faria a loja desconfiar da planilha (Tasks 3 e 4, ida e volta).
2. **O Excel estraga números:** NCM sem o zero da frente, código de barras em notação científica, preço digitado "12.50" (Task 3).
3. **Duas linhas do mesmo produto discordando** em NCM, tipo ou categorias (Task 4).
4. **Trocar códigos de barras entre duas variações** na mesma planilha: precisa funcionar, sem esbarrar na repetição no meio da gravação (Task 2).
5. **Erro no meio da gravação** (algo que a prévia não pegou): nada fica gravado (Task 2, tudo ou nada).

---

### Task 1: Banco: formas únicas pelo nome e exportação do catálogo

**Arquivos:**
- Criar: `supabase/migrations/<ts>_planilha_exportacao.sql`, `supabase/tests/database/20_planilha_exportacao.test.sql`
- Modificar: `src/lib/catalogo/erros.ts` e `src/lib/mensagens.ts` (`formaRepetida`), `src/lib/supabase/tipos.ts` (artefato do CI)

**Interfaces:**
- Produz:
  - índice único `formas_venda_nome_por_variacao` em `(variacao_id, lower(trim(nome)))`. Antes, a migração confere se há repetidos e, se houver, para com a lista (código interno e nome), sem apagar nada;
  - `catalogo_para_planilha() returns jsonb`, só administrador, `security invoker`, `stable`. Devolve:
    - `variacoes`: todas as variações (ativas e inativas), ordenadas por produto e código, com `produto_id`, `produto`, `variacao`, `codigo_interno`, `codigo_barras`, `ncm`, `categorias` (caminhos "Pai > Filho" em ordem alfabética), `materiais` (em ordem alfabética), `tipo_venda`, `controla_validade`, `apto_forno`, `apto_freezer`, `apto_microondas`, `apto_alimento`, `estoque_minimo`, `comprimento_mm`, `largura_mm`, `altura_mm`, `capacidade_ml`, `tem_movimentacoes`, `tem_saldo`, `tem_formas` (qualquer forma, mesmo desativada);
    - `formas`: só as formas **ativas**, com `codigo_interno`, `forma`, `fator`, `preco_centavos` e `faixas` (`[{quantidade_minima, preco_centavos}]`, em ordem).

- [ ] **Passo 1: escrever o teste pgTAP que falha** (`20_planilha_exportacao`):
  - o índice existe; duas formas "Pacote" e " pacote " na mesma variação são recusadas (23505); em variações diferentes, são aceitas;
  - a funcionária recebe `Você não tem permissão para acessar esta página.`;
  - com um produto em `Bolos > Caixas` e `Festa`, material `Papel`, duas variações e uma forma com faixa: o jsonb traz as duas variações, `categorias = ["Bolos > Caixas", "Festa"]`, a forma com a faixa, e não traz a forma desativada;
  - `tem_movimentacoes` e `tem_saldo` mudam depois de uma entrada pelo estoque.
- [ ] **Passo 2:** enviar e confirmar no CI que FALHA.
- [ ] **Passo 3:** implementar a migração; mapear `formas_venda_nome_por_variacao` para `Esta variação já tem uma forma de venda com este nome.`.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSA; baixar os tipos do artefato.
- [ ] **Passo 5:** commit com `Adiciona formas únicas pelo nome e a exportação do catálogo para a planilha`.

### Task 2: Banco: importar a planilha, tudo ou nada

**Arquivos:**
- Criar: `supabase/migrations/<ts>_planilha_importacao.sql`, `supabase/tests/database/21_planilha_importacao.test.sql`
- Modificar: `src/lib/supabase/tipos.ts` (artefato do CI)

**Interfaces:**
- Consome: `catalogo_para_planilha()` (Task 1, nos testes), `normalizar_codigo_interno` e os índices do plano 1.2.
- Produz: `importar_planilha(dados jsonb) returns void`, só administrador. Formato de `dados`:

```ts
type DadosDaImportacao = {
  produtos: {
    id: string | null // null = produto novo
    nome: string; ncm: string | null; tipo_venda: "unidade" | "peso"; controla_validade: boolean
    apto_forno: boolean; apto_freezer: boolean; apto_microondas: boolean; apto_alimento: boolean
    categorias: string[] // "Bolos > Caixas"
    materiais: string[]
    variacoes: {
      codigo_interno: string; nome: string; codigo_barras: string | null; estoque_minimo: number
      comprimento_mm: number | null; largura_mm: number | null; altura_mm: number | null; capacidade_ml: number | null
    }[]
  }[]
  formas: {
    codigo_interno: string
    formas: { nome: string; fator: number; preco_centavos: number; faixas: { quantidade_minima: number; preco_centavos: number }[] }[]
  }[]
}
```

- **Ordem da gravação**, numa transação só:
  1. trava contra outra importação ao mesmo tempo (`pg_advisory_xact_lock`);
  2. categorias: acha cada nível pelo nome (sem diferença de maiúsculas) dentro do pai e cria o que falta; materiais: acha pelo nome ou cria;
  3. produtos: cria (`id` nulo) ou atualiza só as colunas que mudaram (`is distinct from`, para não sujar o histórico); troca o conjunto de categorias e materiais;
  4. variações: primeiro esvazia o código de barras das variações da lista que vão trocar de código (assim, dois códigos trocados entre si não esbarram na repetição); depois cria ou atualiza pelo código interno normalizado. Variação que já existe em outro produto é erro (`Variação {código} não é do produto {nome}.`);
  5. formas: em cada código da lista, acha a forma pelo nome, atualiza ou cria, com `ativa = true` e `peso_variavel` = produto por peso; desativa as que não vieram; nas formas da lista, apaga as faixas que não vieram e grava as outras.

- [ ] **Passo 1: escrever o teste pgTAP que falha** (`21_planilha_importacao`):
  - a funcionária é recusada;
  - produto novo com duas variações, `Bolos > Caixas` (cria Bolos e Caixas) e material novo: tudo criado, e "Padrão" quando o nome da variação vem vazio;
  - `Bolos > Caixas` com Bolos já existente como "bolos": usa o que existe, não cria outro;
  - atualização: renomeia o produto, apaga o código de barras (nulo), troca as categorias; o produto que não mudou não ganha linha nova no histórico;
  - formas: a variação com formas na lista fica só com elas (a que sumiu fica `ativa = false`, as faixas que sumiram são apagadas); a variação fora de `formas` não muda;
  - a forma desativada com o mesmo nome volta a ficar ativa;
  - produto por peso: a forma é gravada com `peso_variavel = true`;
  - troca de código de barras entre duas variações na mesma chamada funciona;
  - tudo ou nada: com uma faixa fora de ordem na última forma, nada da chamada fica gravado (nem o produto novo do começo).
- [ ] **Passo 2:** enviar e confirmar no CI que FALHA.
- [ ] **Passo 3:** implementar a migração (`security invoker`: as políticas de administrador do catálogo já deixam gravar).
- [ ] **Passo 4:** enviar e confirmar no CI que PASSA; baixar os tipos do artefato.
- [ ] **Passo 5:** commit com `Adiciona a importação da planilha no banco, tudo ou nada`.

### Task 3: Leitura e escrita do `.xlsx`

**Arquivos:**
- Criar:
  - `src/lib/planilha/tipos.ts` (os tipos abaixo)
  - `src/lib/planilha/colunas.ts` (nomes das abas e colunas, na ordem do modelo)
  - `src/lib/planilha/celulas.ts` e `celulas.test.ts` (cada célula para valor ou erro)
  - `src/lib/planilha/ler.ts`, `src/lib/planilha/escrever.ts` e `planilha.test.ts` (ida e volta)
- Modificar: `package.json` (`exceljs` em `dependencies`; depois rodar `npm run deps:regenerar`), `src/lib/mensagens.ts` (textos da tabela acima)

**Interfaces:**
- Produz:

```ts
type Aba = "Variações" | "Formas de venda"
type ErroDaPlanilha = { aba: Aba | null; linha: number | null; coluna: string | null; mensagem: string }
type LinhaVariacao = {
  linha: number; produto: string; variacao: string; codigoInterno: string; codigoBarras: string | null; ncm: string | null
  categorias: string[]; materiais: string[]; tipoVenda: "unidade" | "peso"; controlaValidade: boolean
  aptoForno: boolean; aptoFreezer: boolean; aptoMicroondas: boolean; aptoAlimento: boolean; estoqueMinimo: number
  comprimentoMm: number | null; larguraMm: number | null; alturaMm: number | null; capacidadeMl: number | null
}
type LinhaForma = { linha: number; codigoInterno: string; forma: string; fator: number; quantidadeMinima: number; precoCentavos: number }
type PlanilhaLida = { variacoes: LinhaVariacao[]; formas: LinhaForma[]; erros: ErroDaPlanilha[] }

lerPlanilha(arquivo: ArrayBuffer): Promise<PlanilhaLida>
escreverPlanilha(variacoes: Omit<LinhaVariacao, "linha">[], formas: Omit<LinhaForma, "linha">[]): Promise<ArrayBuffer>
```

- Regras da leitura:
  - célula de fórmula vale o resultado; texto rico e link valem o texto;
  - código interno é normalizado (maiúsculas, sem espaços nas pontas);
  - categorias normalizadas: espaços em volta do `>` viram um só (`Bolos>Caixas` → `Bolos > Caixas`), vazios entre `;` são ignorados, e a lista fica em ordem alfabética, como a exportação. Materiais: o mesmo, separados por `;`;
  - uma linha com erro não entra em `variacoes`/`formas` (o erro vai em `erros`).
- Regras da escrita: Código interno, Código de barras e NCM como texto; Preço (R$) como número com formato `"R$" #,##0.00`; S/N como "S" ou "N"; a primeira linha congelada e em negrito.

- [ ] **Passo 1: escrever os testes unitários que falham:**
  - `celulas.test.ts`:
    - NCM `4021010` (número) → `"04021010"`; `"1234"` → erro `O NCM precisa ter 8 dígitos.`;
    - código de barras `7891000000014` (número) → `"7891000000014"`; `"7891000000015"` → `Código de barras inválido.`;
    - preço `12.5` (número) → 1250; `"12,50"`, `"R$ 12,50"` → 1250; `"1.234,56"` → 123456; `"12.50"` e `"-1"` → erro de preço;
    - S/N: `"s"`, `"Sim"` → true; `"n"`, `"não"`, vazio → false; `"talvez"` → `Use S ou N.`;
    - tipo: `"Peso"` → `"peso"`; vazio → `Preencha este campo.`;
    - Estoque mínimo vazio → 0; `-1` e `"1,5"` → `Use um número inteiro, zero ou mais.`;
    - categoria `"Bolos >> Caixas"` → erro de categoria; `"Bolos>Caixas; ;Festa"` → `["Bolos > Caixas", "Festa"]`;
  - `planilha.test.ts`:
    - ida e volta: `escreverPlanilha` de 2 variações e 2 formas (uma com faixa) e depois `lerPlanilha` devolve as mesmas linhas, sem erros, com `linha` 2 e 3;
    - sem a aba Formas de venda → `A planilha não tem a aba “Formas de venda”.`; sem a coluna NCM → `A aba “Variações” não tem a coluna “NCM”.`;
    - colunas fora de ordem são lidas pelo nome; linhas vazias são ignoradas;
    - 5.001 linhas na aba Variações → `Cada aba pode ter até 5.000 linhas.`;
    - um arquivo que não é `.xlsx` → `Arquivo inválido: use uma planilha .xlsx (o modelo baixado do sistema).`;
    - erro com aba, linha do Excel e coluna: NCM errado na 3ª linha de dados → `{ aba: "Variações", linha: 4, coluna: "NCM" }`.
- [ ] **Passo 2:** rodar `npm test` e confirmar que FALHAM (módulos inexistentes).
- [ ] **Passo 3:** implementar (`exceljs`: `workbook.xlsx.load(buffer)` e `workbook.xlsx.writeBuffer()`).
- [ ] **Passo 4:** rodar `npm test`, `npm run lint` e `npm run typecheck` e confirmar que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a leitura e a escrita da planilha do catálogo`.

### Task 4: Prévia: comparar com o catálogo

**Arquivos:**
- Criar: `src/lib/planilha/conferir.ts` e `conferir.test.ts`, `src/lib/planilha/catalogo.ts` (de `catalogo_para_planilha()` para `CatalogoAtual`)
- Modificar: `src/lib/planilha/tipos.ts` (acrescenta `DadosDaImportacao`, no formato da Task 2, `VariacaoAtual`, `CatalogoAtual` e `Previa`)

**Interfaces:**
- Consome: `PlanilhaLida`, `LinhaVariacao`, `LinhaForma` (Task 3); o jsonb de `catalogo_para_planilha()` (Task 1); `DadosDaImportacao` (Task 2).
- Produz:

```ts
type VariacaoAtual = Omit<LinhaVariacao, "linha"> & { produtoId: string; temMovimentacoes: boolean; temSaldo: boolean; temFormas: boolean }
type CatalogoAtual = { variacoes: VariacaoAtual[]; formas: Omit<LinhaForma, "linha">[] }
type Previa = { criados: number; atualizados: number; semMudanca: number; erros: ErroDaPlanilha[]; dados: DadosDaImportacao | null }

paraCatalogoAtual(json: unknown): CatalogoAtual
conferirPlanilha(lida: PlanilhaLida, atual: CatalogoAtual): Previa
```

- `dados` vem nulo quando há erro ou quando não há nada a fazer. Ele só traz o que é novo ou mudou: produtos com alguma variação nova ou mudada (com as colunas do produto da planilha) e as formas das variações cujas formas mudaram.
- Comparação: nomes de forma, categorias e materiais sem diferença de maiúsculas; formas pela lista de (nome, fator, preço, faixas).

- [ ] **Passo 1: escrever os testes unitários que falham** (`conferir.test.ts`, com um `CatalogoAtual` montado no teste):
  - catálogo igual à planilha → `{ criados: 0, atualizados: 0, semMudanca: 2, erros: [], dados: null }`;
  - uma variação nova e uma com o código de barras apagado → `criados: 1, atualizados: 1` e `dados` com as duas;
  - mesma planilha com "bolos > caixas" no lugar de "Bolos > Caixas" → sem mudança;
  - código interno em duas linhas → erro nas duas, coluna "Código interno";
  - duas linhas do mesmo produto com NCM diferente → erro na segunda, coluna "NCM";
  - linha nova com o Produto de uma variação existente que também está na planilha → entra no mesmo `id`; com o nome de dois produtos existentes → erro de nome ambíguo;
  - código de barras de uma variação que não está na planilha → `Este código de barras já está em outra variação.`; troca de códigos entre duas variações da planilha → sem erro;
  - formas: sem a linha de quantidade 1 → erro; fatores diferentes na mesma forma → erro; faixa 2 com preço maior que o normal → erro de faixas; código que não existe em lugar nenhum → `Nenhuma variação com este código interno.`;
  - produto por peso com fator 100 ou com faixa → `Produto por peso tem uma forma só, com fator 1000 e preço por kg, sem faixas.`;
  - mudar o tipo de venda de produto com `temMovimentacoes` → texto do banco; com `temFormas` → `Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele.`; mudar o controle de validade com `temSaldo` → texto do banco;
  - erros da leitura (Task 3) chegam junto, e qualquer erro deixa `dados` nulo.
- [ ] **Passo 2:** rodar `npm test` e confirmar que FALHAM.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** rodar `npm test`, `npm run lint` e `npm run typecheck` e confirmar que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a prévia da planilha comparada com o catálogo`.

### Task 5: Telas: baixar, conferir e importar

**Arquivos:**
- Criar:
  - `src/app/(painel)/produtos/planilha/page.tsx` (título "Planilha do catálogo")
  - `src/app/(painel)/produtos/planilha/importar-planilha.tsx` (cliente)
  - `src/app/(painel)/produtos/planilha/acoes.ts`
  - `src/app/(painel)/produtos/planilha/modelo/route.ts` e `exportar/route.ts`
  - `e2e/planilha.spec.ts`, `e2e/apoio/planilha.ts` (monta `.xlsx` de teste com `exceljs`)
- Modificar: `src/app/(painel)/produtos/page.tsx` (link "Planilha" ao lado de "Novo produto", só para o administrador)

**Interfaces:**
- Consome: `lerPlanilha`, `escreverPlanilha` (Task 3); `paraCatalogoAtual`, `conferirPlanilha` (Task 4); `catalogo_para_planilha` e `importar_planilha` (Tasks 1 e 2).
- Produz:
  - `GET /produtos/planilha/modelo` → `catalogo-modelo.xlsx` (só os cabeçalhos);
  - `GET /produtos/planilha/exportar` → `catalogo-AAAA-MM-DD.xlsx` (data de São Paulo);
  - as ações `preverPlanilha(_estado, formData): Promise<ResultadoDaPlanilha>` e `gravarPlanilha(_estado, formData): Promise<ResultadoDaPlanilha>` (nomes diferentes de `conferirPlanilha`, a função pura da Task 4), com `ResultadoDaPlanilha = { erro: string; sucesso: string; resumo: string; erros: ErroDaPlanilha[]; podeImportar: boolean }`;
  - as duas leem o arquivo do campo `planilha`, recusam acima de 4 MB e chamam `lerPlanilha`, `catalogo_para_planilha` e `conferirPlanilha`; `gravarPlanilha` só chama `importar_planilha` quando não há erro e `dados` não é nulo, e então revalida `/produtos`.
- Tela:
  - **Baixar:** links "Baixar modelo" e "Exportar catálogo";
  - **Importar:** campo "Planilha (.xlsx)" e botão "Conferir planilha". Depois da prévia aparecem o resumo e, se houver erros, a tabela "Erros da planilha" (Aba, Linha, Coluna, Problema);
  - sem erros e com algo a fazer, aparece "Importar planilha", com confirmação do navegador. O mesmo arquivo é enviado de novo; o servidor confere outra vez e grava;
  - trocar de arquivo limpa a prévia.

- [ ] **Passo 1: escrever os testes de tela que falham:**

```ts
test("exportar o catálogo e importar de volta sem mudar nada: tudo sem mudança")
test("planilha nova cria produtos com variações, categorias, materiais e forma com faixa")
test("erros aparecem por aba, linha e coluna, e nada é importado")
test("planilha atualiza: renomeia o produto, apaga o código de barras vazio e desativa a forma que sumiu")
test("funcionária não vê a planilha nem baixa o catálogo")
```

  - O primeiro baixa pelo "Exportar catálogo" (`page.waitForEvent("download")`), manda o mesmo arquivo e espera `0 criado(s), 0 atualizado(s) e 2 sem mudança.`, além de `Nada a importar: a planilha é igual ao catálogo.`, sem o botão "Importar planilha".
  - O segundo confere, espera `3 criado(s), 0 atualizado(s) e 0 sem mudança.`, importa, espera `Planilha importada: 3 criado(s) e 0 atualizado(s).` e abre a ficha do produto com a forma e a faixa.
  - O terceiro espera as linhas da tabela "Erros da planilha" (por exemplo `Variações`, `3`, `NCM`, `O NCM precisa ter 8 dígitos.`) e que a lista de produtos continue sem o produto.
- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a planilha do catálogo: modelo, exportação, prévia e importação`.

### Task 6: Manual e fechamento

**Arquivos:**
- Criar: `docs/manual/planilha-do-catalogo.md`
- Modificar: `README.md` (situação e link do manual)

- [ ] **Passo 1:** escrever o manual em português simples, com os textos exatos dos botões. Ele cobre:
  - baixar o modelo e exportar o catálogo;
  - cada coluna das duas abas, com exemplo (categorias com `>` e `;`, S/N, estoque mínimo em un ou g, preço normal e faixas);
  - a regra "a planilha manda": vazio apaga, forma que sumiu é desativada, o que está fora da planilha não muda;
  - acrescentar uma variação a um produto que já existe (exportar, acrescentar a linha, importar);
  - ler a prévia e corrigir os erros;
  - o que a planilha não muda (estoque, custo, fotos, descrição, inativo).
- [ ] **Passo 2:** rodar `npm test && npm run lint && npm run typecheck` e confirmar que o CI ficou verde, com todos os testes de banco, de concorrência e de tela.
- [ ] **Passo 3:** commit com `Adiciona o manual da planilha do catálogo`.
- [ ] **Passo 4:** fazer a revisão final do branch inteiro. Depois, com a aprovação do usuário, juntar no `main` e conferir o site principal.
