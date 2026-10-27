# Fase 1.2: Catálogo (Plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** cadastrar os produtos da loja: produtos, variações, formas de venda com preço por quantidade, categorias, materiais, fotos e compatibilidades, com situação automática (incompleto ou ativo), grade de variações, busca, filtros e edição em massa.

**Arquitetura:** as regras do catálogo ficam no banco, como no plano 1.1: tabelas com `CHECK`, gatilhos, uma view que calcula a situação e funções para criar produto, buscar e editar em massa. As fotos vão direto do navegador para o Supabase Storage, sem passar pelo servidor do Next. As telas leem com o login de quem está usando, e só o administrador consegue gravar (RLS com `eh_administrador()`).

**Tecnologia:** a mesma do plano 1.1, mais a extensão `unaccent` do Postgres (busca sem acento) e o Supabase Storage.

**Especificação:** [docs/superpowers/specs/2026-10-21-fase-1-base-design.md](../specs/2026-10-21-fase-1-base-design.md), seções 6.1, 8 (linhas de cadastro), 9.3 e 10.3–10.4.

**Fica fora deste plano:**
- busca pelo nome do fornecedor (chega no plano 1.4, com as notas);
- planilhas (plano 1.5);
- custos e estoque (plano 1.3).

## Restrições globais

- Tudo o que o plano 1.1 definiu continua valendo: português do Brasil, R$, fuso de São Paulo, dinheiro em centavos inteiros, RLS em toda tabela, `anon` sem acesso e administrador só com `aal2`.
- **Permissões do catálogo:**
  - Ler: `eh_usuario_ativo()`.
  - Gravar: `eh_administrador()`.
  - O funcionário vê produtos, variações, formas de venda, preços, categorias, materiais, fotos e compatibilidades, mas não vê nenhum botão de editar.
- **Situação do produto:** é **calculada** pela view `produtos_com_situacao` a cada leitura, não gravada. Só a escolha de inativar fica gravada, na coluna `produtos.inativo`. Assim a situação nunca fica desatualizada: o sistema muda sozinho entre incompleto e ativo, e o inativo prevalece, como pede a especificação.
- **Nada se apaga em produtos e variações:** os dois são só inativados (`revoke delete`), porque o estoque do plano 1.3 vai apontar para eles. Categorias, materiais, fotos, faixas e compatibilidades podem ser apagados.
- **Histórico:** `registrar_historico()` (plano 1.1) fica ligado a `produtos`, `variacoes`, `formas_venda`, `faixas_preco` e `categorias`.
- **Erros do banco:** regras de negócio usam `raise exception` (P0001) com o texto exato da tabela abaixo. Repetições (23505) e itens em uso (23503) são traduzidos no app pelo nome da restrição.
- **CI:** o `npx supabase start` do CI passa a incluir o `storage-api`, que sai da lista do `-x`.
- **Pacotes:** depois de qualquer `npm install <pacote>`, rodar `npm run deps:regenerar`.
- **Testes:**
  - `npm test`, `lint`, `typecheck` e `build` rodam no computador.
  - pgTAP e Playwright rodam no CI. Cada passo de "rodar e ver falhar/passar" desses é: enviar o branch e ler o resultado com `gh run watch` ou `gh run view --log-failed`.
  - Os tipos do banco vêm do artefato `tipos-do-banco`.

## Textos fixos da interface

| Situação | Texto |
|---|---|
| Categoria repetida no mesmo nível | `Já existe uma categoria com este nome aqui.` |
| Categoria com subcategorias ou produtos | `Esta categoria tem subcategorias ou produtos e não pode ser apagada.` |
| Categoria dentro dela mesma | `Uma categoria não pode ficar dentro dela mesma.` |
| Material repetido | `Este material já existe.` |
| Material em uso | `Este material está em produtos e não pode ser apagado.` |
| Código de barras inválido | `Código de barras inválido.` |
| Código de barras repetido | `Este código de barras já está em outra variação.` |
| Código interno repetido | `Este código interno já está em outra variação.` |
| NCM inválido | `O NCM precisa ter 8 dígitos.` |
| CEST inválido | `O CEST precisa ter 7 dígitos.` |
| Faixa fora de ordem | `O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.` |
| Faixa repetida | `Já existe uma faixa com esta quantidade mínima.` |
| Tipo de venda em conflito | `Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele.` |
| Forma a granel em produto por unidade | `Só produto vendido por peso tem forma a granel.` |
| Foto grande | `A foto precisa ter até 5 MB.` |
| Foto em outro formato | `Use uma foto em JPG, PNG ou WebP.` |
| Fotos demais | `Cada produto pode ter até 8 fotos.` |
| Compatibilidade repetida | `Estas variações já estão ligadas.` |
| Compatibilidade consigo mesma | `Escolha uma variação diferente.` |
| Percentual inválido | `Informe o reajuste em %, por exemplo 10 ou -5.` |
| Nada selecionado | `Selecione pelo menos um produto.` |
| Salvo | `Alterações salvas.` |
| Reajuste feito | `Reajuste aplicado em {n} produto(s).` |
| Grade sem novidade | `Nenhuma variação nova: todas as combinações já existiam.` |
| Grade criada | `{n} variação(ões) criada(s).` |
| O que falta para ativar | `Para ficar ativo falta: {itens}.` (itens entre: `variação ativa com forma de venda`, `categoria`, `foto`, `NCM`) |

## Pontos de atenção na revisão

1. **Reajuste com desconto que deixaria duas faixas com o mesmo preço:** mostra a mensagem da faixa fora de ordem, e **nenhum** preço muda, porque é tudo ou nada (Task 3).
2. **Gerar a mesma grade duas vezes:** não duplica variações, e a mensagem diz que não havia novidade (Task 7).
3. **Trocar o tipo de venda de um produto que já tem formas de venda incompatíveis:** é bloqueado com a mensagem (Task 2).
4. **Foto maior que 5 MB, em PDF, ou uma 9ª foto:** mostra a mensagem certa e não salva nada (Task 8).
5. **Apagar categoria que tem produto ou subcategoria:** é bloqueado com a mensagem, e a categoria continua lá (Task 5).

---

### Task 1: Banco: estrutura do catálogo, códigos e permissões

**Arquivos:**
- Criar: `supabase/migrations/<ts>_catalogo_estrutura.sql`, `supabase/tests/database/04_catalogo_estrutura.test.sql`
- Modificar: `src/lib/supabase/tipos.ts` (artefato do CI)

**Interfaces:**
- Produz:
  - `enum tipo_venda ('unidade','peso')`
  - tabelas:
    - `produtos(id uuid pk default gen_random_uuid(), nome text 1..160, descricao text default '', tipo_venda, controla_validade bool default false, ncm text null check '^\d{8}$', cest text null check '^\d{7}$', origem_fiscal smallint null check 0..8, apto_forno/apto_freezer/apto_microondas/apto_alimento bool default false, inativo bool default false, criado_em, atualizado_em)`
    - `categorias(id uuid, nome text 1..80, categoria_pai_id uuid null references categorias on delete restrict, ordem int default 0)` com índice único `categorias_nome_por_pai` em `(categoria_pai_id, lower(nome)) nulls not distinct`
    - `produto_categorias(produto_id references produtos, categoria_id references categorias on delete restrict, pk)`
    - `etiquetas(id uuid, nome text unique — restrição etiquetas_nome_key em lower(nome))`
    - `produto_etiquetas(produto_id, etiqueta_id references etiquetas on delete restrict, pk)`
    - `variacoes(id uuid, produto_id references produtos, nome text 1..120, codigo_interno text not null — restrição variacoes_codigo_interno_key, codigo_barras text null check gtin_valido — restrição variacoes_codigo_barras_key, atributos jsonb default '{}', comprimento_mm/largura_mm/altura_mm/capacidade_ml int null check > 0, estoque_minimo bigint default 0 check >= 0, ativa bool default true, criado_em)`
  - funções:
    - `gtin_valido(text): boolean`
    - `proximo_codigo_interno(): text`
    - `criar_produto(dados jsonb): uuid`
    - `tocar_atualizado_em()` (gatilho)

- [ ] **Passo 1: escrever o teste que falha**, `04_catalogo_estrutura.test.sql`. Ele cria a dona (`…0a`, administradora com aal2) e a funcionária (`…0b`).

```sql
select ok(gtin_valido('4006381333931'), 'EAN-13 válido');
select ok(gtin_valido('96385074'), 'EAN-8 válido');
select ok(gtin_valido('036000291452'), 'UPC-A válido');
select ok(not gtin_valido('4006381333932'), 'dígito errado');
select ok(not gtin_valido('12345'), 'tamanho errado');
-- como administradora:
select is(proximo_codigo_interno(), 'P000001');
-- criar_produto('{"nome":"Forminha nº 4","tipo_venda":"unidade","variacao":{"nome":"Marrom"}}') devolve id;
--   existe 1 variação, com codigo_interno 'P000001'
-- se o usuário já usou 'P000002' à mão, o próximo gerado pula para 'P000003'
select throws_ok($$insert into categorias (nome) values ('BOLOS')$$, '23505'); -- já existe 'Bolos' na raiz
select lives_ok($$insert into categorias (nome, categoria_pai_id) values ('Bolos', <id de Festas>)$$); -- outro nível pode
select throws_ok($$update categorias set categoria_pai_id = <filha> where id = <mãe>$$, 'P0001', 'Uma categoria não pode ficar dentro dela mesma.');
select throws_ok($$delete from categorias where id = <mãe com filha>$$, '23503');
select throws_ok($$delete from variacoes where id = <qualquer>$$, '42501'); -- ninguém apaga
-- como funcionária: lê produtos (count = 1); insert em produtos e update em categorias não afetam nada
-- update de produtos.nome como administradora grava historico_cadastro (tabela 'produtos', campo 'nome')
```

- [ ] **Passo 2:** enviar e confirmar no CI que os testes do banco FALHAM porque as relações não existem.
- [ ] **Passo 3:** escrever a migração.
  - **`gtin_valido`:** `immutable`. Aceita 8, 12, 13 ou 14 dígitos e confere o dígito verificador módulo 10, com pesos 3 e 1 a partir da direita.
  - **`proximo_codigo_interno`:** usa a sequência `seq_codigo_interno`, montando `'P' || lpad(n, 6, '0')`, e repete enquanto o código gerado já existir em `variacoes`.
  - **`variacoes.codigo_interno`:** fica com `default proximo_codigo_interno()`.
  - **`criar_produto`:** `security invoker`. Exige `eh_administrador()`; se não for, lança `'Você não tem permissão para acessar esta página.'`. Insere o produto e a primeira variação, com nome padrão `'Padrão'`, na mesma transação.
  - **Gatilho `categorias_sem_ciclo`:** recusa um pai que seja a própria categoria ou uma de suas descendentes.
  - **`tocar_atualizado_em`:** ligado a `produtos`.
  - **`registrar_historico`:** ligado a `produtos`, `variacoes` e `categorias`.
  - **RLS** das 6 tabelas: `select` por `eh_usuario_ativo()`; `insert`, `update` e `delete` por `eh_administrador()`. Também `revoke delete on produtos, variacoes from authenticated`.
- [ ] **Passo 4:** enviar e confirmar no CI que os testes do banco PASSAM. Baixar o artefato `tipos-do-banco` para `src/lib/supabase/tipos.ts` e rodar `npm run typecheck`.
- [ ] **Passo 5:** commit com `Cria a estrutura do catálogo no banco`.

### Task 2: Banco: formas de venda, faixas de preço e situação

**Arquivos:**
- Criar: `supabase/migrations/<ts>_catalogo_venda.sql`, `supabase/tests/database/05_catalogo_venda.test.sql`, `supabase/tests/database/06_catalogo_situacao.test.sql`

**Interfaces:**
- Consome: as tabelas da Task 1.
- Produz:
  - tabelas:
    - `formas_venda(id uuid, variacao_id references variacoes, nome text 1..60, fator bigint check > 0, preco_centavos int check >= 0, peso_variavel bool default false, ativa bool default true, check (not peso_variavel or fator = 1000))`, com índice único parcial `formas_venda_um_granel` em `(variacao_id) where peso_variavel`
    - `faixas_preco(id uuid, forma_venda_id references formas_venda on delete cascade, quantidade_minima int check >= 2, preco_centavos int check >= 0, unique (forma_venda_id, quantidade_minima) — restrição faixas_preco_quantidade_key)`
    - `compatibilidades(id uuid, variacao_a_id, variacao_b_id references variacoes, descricao text default '', check (variacao_a_id <> variacao_b_id))`, com índice único `compatibilidades_par_key` em `(least(a,b), greatest(a,b))`
    - `fotos(id uuid, produto_id references produtos, variacao_id uuid null references variacoes, caminho text not null, ordem int default 0, criado_em)`, criada aqui para a view; o Storage e o limite de 8 ficam na Task 3
  - view `produtos_com_situacao` (`security_invoker = true`): todas as colunas de `produtos`, mais `situacao text` (`'inativo'` | `'ativo'` | `'incompleto'`) e `pendencias text[]`

- [ ] **Passo 1: escrever os testes que falham.**

`05_catalogo_venda.test.sql`, como administradora, sobre um produto por unidade e um por peso:

```sql
select throws_ok($$insert into formas_venda (variacao_id, nome, fator, preco_centavos, peso_variavel) values (<var. unidade>, 'Granel', 1000, 3200, true)$$,
  'P0001', 'Só produto vendido por peso tem forma a granel.');
select throws_ok($$insert into formas_venda (..., peso_variavel) values (<var. peso>, 'Granel', 500, 3200, true)$$, '23514'); -- granel exige fator 1000
select throws_ok($$insert de uma 2ª forma granel na mesma variação$$, '23505');
-- forma "Pacote com 100" a 600: faixa 10 → 540 vive; faixa 20 → 550 falha no commit (P0001, texto da faixa fora de ordem)
-- faixa com preço 600 (igual ao normal) falha; faixa em forma granel falha
select throws_ok($$update produtos set tipo_venda = 'peso' where id = <produto unidade com forma de fator 100>$$,
  'P0001', 'Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele.');
-- compatibilidade (a,b) vive; (b,a) falha com 23505; (a,a) falha com 23514
```

`06_catalogo_situacao.test.sql`:

```sql
-- produto recém-criado: situacao 'incompleto', pendencias '{variação ativa com forma de venda,categoria,foto,NCM}'
-- com NCM, categoria, forma de venda e foto: 'ativo', pendencias '{}'
-- apagar a foto: volta a 'incompleto' com pendencias '{foto}'
-- inativo = true: 'inativo', mesmo completo; inativo = false: 'ativo'
-- variação ativa = false (a única): pendencia 'variação ativa com forma de venda'
-- forma ativa = false: idem
-- como funcionária: a view devolve o produto (leitura liberada)
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** escrever a migração.
  - **Gatilho `formas_venda_combinam_com_produto`** (`before insert or update`): uma forma `peso_variavel` em produto `unidade` lança o texto da forma a granel em produto por unidade.
  - **Gatilho `tipo_venda_combina_com_formas`** (`before update of tipo_venda on produtos`):
    - para `peso`, recusa se existir qualquer forma que não seja a granel (as porções fixas só chegam na fase 3);
    - para `unidade`, recusa se existir forma `peso_variavel`.
  - **Gatilho de restrição `faixas_em_ordem`** (`deferrable initially deferred`, em `faixas_preco` e em `formas_venda`):
    - em cada forma afetada, as faixas ordenadas por `quantidade_minima` precisam ter preços estritamente menores que o da faixa anterior e que `formas_venda.preco_centavos`;
    - forma `peso_variavel` não pode ter faixas.
  - **View `produtos_com_situacao`:**
    - `pendencias` monta o array dos 4 itens que faltam;
    - `situacao` é `inativo` se `inativo`; senão é `ativo` se `pendencias = '{}'`; senão é `incompleto`.
  - **RLS e histórico:**
    - RLS como na Task 1 para as 4 tabelas novas;
    - `registrar_historico` ligado a `formas_venda` e `faixas_preco`;
    - `revoke delete on formas_venda from authenticated`: forma de venda é só inativada.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM. Atualizar os tipos.
- [ ] **Passo 5:** commit com `Adiciona formas de venda, faixas de preço e situação do produto`.

### Task 3: Banco: busca, edição em massa e fotos

**Arquivos:**
- Criar: `supabase/migrations/<ts>_catalogo_busca_massa_fotos.sql`, `supabase/tests/database/07_catalogo_busca_massa.test.sql`, `supabase/tests/database/08_catalogo_fotos.test.sql`
- Modificar: `.github/workflows/ci.yml` (tirar `storage-api` do `-x`), `supabase/config.toml` (`[storage]` ligado)

**Interfaces:**
- Produz:
  - `buscar_produtos(p_termo text, p_categoria uuid, p_situacao text, p_tipo_venda tipo_venda, p_controla_validade boolean, p_etiqueta uuid, p_limite int, p_deslocamento int)`, que devolve uma tabela com `id uuid, nome text, situacao text, tipo_venda tipo_venda, variacoes int, menor_preco_centavos int, total bigint`
  - `reajustar_precos(p_produtos uuid[], p_percentual numeric): int` (quantidade de produtos afetados)
  - `alterar_categoria_em_massa(p_produtos uuid[], p_categoria uuid, p_incluir boolean): int`
  - `alterar_inativo_em_massa(p_produtos uuid[], p_inativo boolean): int`
  - bucket `fotos-produtos` (público para leitura, 5 MB, `image/jpeg`, `image/png`, `image/webp`) e gatilho `no_maximo_8_fotos`

- [ ] **Passo 1: escrever os testes que falham.**

`07_catalogo_busca_massa.test.sql`:

```sql
-- "Caixa para bolo" (cód. barras 4006381333931, categoria Bolos > Caixas) e "Forminha nº 4" (categoria Doces)
select is((select count(*) from buscar_produtos('caixa', null, null, null, null, null, 50, 0)), 1::bigint, 'sem diferenciar maiúscula');
select is((select nome from buscar_produtos('forminha n', ...)), 'Forminha nº 4');
select is((select count(*) from buscar_produtos('Forminhá', ...)), 1::bigint, 'sem acento');
select is((select nome from buscar_produtos('4006381333931', ...)), 'Caixa para bolo', 'por código de barras');
select is((select count(*) from buscar_produtos(null, <id de Bolos>, ...)), 1::bigint, 'categoria inclui subcategorias');
select is((select total from buscar_produtos(null, null, null, null, null, null, 1, 0) limit 1), 2::bigint, 'total ignora a paginação');
-- reajustar_precos(array[ambos], 10): forma 600 → 660; faixa 540 → 594; forma 105 → 116 (meio centavo arredonda para cima); devolve 2
-- reajustar_precos(..., -50) com faixas 101 e 100 (viram 51 e 50: ok) e com 100 e 99 (viram 50 e 50): lança o texto da faixa fora de ordem e NENHUM preço muda
-- percentual <= -100 lança 'Informe o reajuste em %, por exemplo 10 ou -5.'
-- alterar_categoria_em_massa(incluir) não duplica; (remover) tira só a escolhida
-- alterar_inativo_em_massa(true) → situacao 'inativo' nos dois
-- como funcionária: as 3 funções de massa lançam 'Você não tem permissão para acessar esta página.'
```

`08_catalogo_fotos.test.sql`:

```sql
-- 8 fotos no produto: a 9ª lança 'Cada produto pode ter até 8 fotos.'
-- bucket fotos-produtos existe, public = true, file_size_limit = 5242880, allowed_mime_types = {image/jpeg,image/png,image/webp}
-- como funcionária: insert em storage.objects do bucket lança 42501 ou não afeta linha; como administradora: insert vive
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** escrever a migração.
  - **`create extension if not exists unaccent with schema extensions`.**
  - **`buscar_produtos`:** `stable security invoker`.
    - O termo casa com `unaccent(lower(nome))` do produto, ou com `codigo_interno` ou `codigo_barras` de qualquer variação.
    - A categoria inclui as descendentes, por CTE recursiva.
    - Ordem por nome; `total` é `count(*) over ()`.
  - **`reajustar_precos`:**
    - exige `eh_administrador()`;
    - multiplica `preco_centavos` de todas as formas e faixas das variações dos produtos por `1 + p/100`, com `round()`;
    - o gatilho adiado da Task 2 valida no fim. Com `set constraints faixas_em_ordem immediate` antes de retornar, o erro sai dentro da função e a transação inteira desfaz.
  - **Bucket:** com `insert into storage.buckets` e as políticas em `storage.objects`:
    - leitura pública do bucket;
    - insert, update e delete só com `eh_administrador()`;
    - caminho `<produto_id>/<uuid>.<ext>`.
  - **CI:** tirar `storage-api` do `-x` no `ci.yml`.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM. Atualizar os tipos.
- [ ] **Passo 5:** commit com `Adiciona busca, edição em massa e fotos no banco`.

### Task 4: Regras do catálogo no app

**Arquivos:**
- Criar:
  - `src/lib/catalogo/gtin.ts`, `src/lib/catalogo/grade.ts`, `src/lib/catalogo/percentual.ts`, `src/lib/catalogo/fotos.ts`, `src/lib/catalogo/erros.ts`
  - um `.test.ts` ao lado de cada um
- Modificar: `src/lib/mensagens.ts` (todos os textos da tabela acima)

**Interfaces:**
- Produz:
  - `gtinValido(texto: string): boolean` (mesma regra de `gtin_valido`)
  - `type Grade = Record<string, string[]>`
  - `lerGrade(texto: string): Grade`: uma linha por atributo, no formato `Tamanho: 4, 6, 12`; lança `Error('Grade inválida')`
  - `combinacoesDaGrade(grade: Grade): { nome: string; atributos: Record<string, string> }[]`
  - `lerPercentual(texto: string): number`: aceita `10`, `-5`, `2,5` e `+3`; recusa vazio, texto e valores `<= -100`; lança `Error('Percentual inválido')`
  - `problemaDaFoto(arquivo: { type: string; size: number }): string | null`
  - `mensagemDoErroDoBanco(erro: { code?: string; message: string }): string`: P0001 devolve `erro.message`; 23505 e 23503 viram o texto da restrição citada na mensagem; o resto vira `MENSAGENS.acaoFalhou`
  - `MENSAGENS` passa a incluir as chaves `categoriaRepetida`, `categoriaEmUso`, `categoriaCiclo`, `materialRepetido`, `materialEmUso`, `codigoBarrasInvalido`, `codigoBarrasRepetido`, `codigoInternoRepetido`, `ncmInvalido`, `cestInvalido`, `faixaForaDeOrdem`, `faixaRepetida`, `tipoVendaConflito`, `granelSoPeso`, `fotoGrande`, `fotoFormato`, `fotoLimite`, `compatibilidadeRepetida`, `compatibilidadeMesma`, `percentualInvalido`, `nenhumSelecionado`, `salvo`, `gradeSemNovidade`; e as funções `mensagemReajuste(n)`, `mensagemGradeCriada(n)` e `mensagemPendencias(itens: string[])`

- [ ] **Passo 1: escrever os testes que falham.**

```ts
expect(gtinValido('4006381333931')).toBe(true); expect(gtinValido('4006381333932')).toBe(false)
expect(lerGrade('Tamanho: 4, 6, 12\nCor: marrom, branca')).toEqual({ Tamanho: ['4','6','12'], Cor: ['marrom','branca'] })
expect(() => lerGrade('Tamanho 4')).toThrow('Grade inválida')
expect(combinacoesDaGrade({ Tamanho: ['4','6','12'], Cor: ['marrom','branca'] })).toHaveLength(6)
expect(combinacoesDaGrade({ Tamanho: ['4'], Cor: ['marrom'] })[0]).toEqual({ nome: '4 marrom', atributos: { Tamanho: '4', Cor: 'marrom' } })
expect(lerPercentual('2,5')).toBe(2.5); expect(lerPercentual('-5')).toBe(-5); expect(() => lerPercentual('-100')).toThrow('Percentual inválido')
expect(problemaDaFoto({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toBeNull()
expect(problemaDaFoto({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).toBe('A foto precisa ter até 5 MB.')
expect(problemaDaFoto({ type: 'application/pdf', size: 10 })).toBe('Use uma foto em JPG, PNG ou WebP.')
expect(mensagemDoErroDoBanco({ code: '23505', message: 'duplicate key value violates unique constraint "variacoes_codigo_barras_key"' }))
  .toBe('Este código de barras já está em outra variação.')
expect(mensagemDoErroDoBanco({ code: 'P0001', message: 'Cada produto pode ter até 8 fotos.' })).toBe('Cada produto pode ter até 8 fotos.')
expect(mensagemPendencias(['categoria', 'foto'])).toBe('Para ficar ativo falta: categoria, foto.')
```

- [ ] **Passo 2:** rodar `npm test` e confirmar que FALHA.
- [ ] **Passo 3:** implementar.
  - `mensagemDoErroDoBanco` usa um mapa do nome da restrição para o texto:
    - `categorias_nome_por_pai`, `etiquetas_nome_key`, `variacoes_codigo_barras_key`, `variacoes_codigo_interno_key`, `faixas_preco_quantidade_key` e `compatibilidades_par_key` (23505);
    - `produto_categorias_categoria_id_fkey` e `categorias_categoria_pai_id_fkey`, que viram `categoriaEmUso`, e `produto_etiquetas_etiqueta_id_fkey`, que vira `materialEmUso` (23503).
- [ ] **Passo 4:** rodar `npm test && npm run lint && npm run typecheck` e confirmar que PASSA.
- [ ] **Passo 5:** commit com `Adiciona as regras do catálogo no app`.

### Task 5: Tela de categorias e materiais

**Arquivos:**
- Criar: `src/app/(painel)/categorias/page.tsx`, `acoes.ts`, `arvore-categorias.tsx`, `lista-materiais.tsx`; `e2e/categorias.spec.ts`
- Modificar:
  - `src/app/(painel)/layout.tsx`: o menu ganha `Produtos` para todos e `Categorias` só para o administrador;
  - `e2e/apoio/supabase.ts`: `limparCatalogo()` apaga todo o catálogo e os arquivos do bucket.

**Interfaces:**
- Consome: `mensagemDoErroDoBanco`, `MENSAGENS` e `exigirAdministrador`.
- Produz as ações:
  - `criarCategoria(estado, formData)`, `renomearCategoria(id, nome)`, `moverCategoria(id, paiId | null)` e `apagarCategoria(id)`, que devolvem `ResultadoAcao`;
  - `criarMaterial(estado, formData)` e `apagarMaterial(id)`.

- [ ] **Passo 1: escrever os testes de tela que falham.**

```ts
test('cria categoria e subcategoria e mostra na árvore')                       // 'Bolos' > 'Caixas para bolo'
test('nome repetido no mesmo nível mostra a mensagem')                          // 'bolos' → 'Já existe uma categoria com este nome aqui.'
test('categoria com subcategoria não é apagada')                                // 'Esta categoria tem subcategorias ou produtos e não pode ser apagada.'; 'Bolos' continua na árvore
test('cria material e não aceita repetido')                                     // 'Kraft'; 'kraft' → 'Este material já existe.'
test('funcionária não vê Categorias no menu e /categorias é sem permissão')
```

- [ ] **Passo 2:** enviar e confirmar no CI que os testes novos FALHAM.
- [ ] **Passo 3:** implementar.
  - A página faz `exigirAdministrador()` e tem `instant = false`.
  - A árvore é montada a partir de `categorias` ordenadas por `ordem` e `nome`; cada item tem os botões `Renomear`, `Mover para…` (um `select` com as outras categorias e "Raiz") e `Apagar`.
  - Os materiais são uma lista simples com campo e botão `Adicionar`.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a tela de categorias e materiais`.

### Task 6: Lista de produtos e cadastro de produto novo

**Arquivos:**
- Criar:
  - `src/app/(painel)/produtos/page.tsx`, `filtros-produtos.tsx`, `tabela-produtos.tsx`
  - `src/app/(painel)/produtos/novo/page.tsx`, `formulario-novo-produto.tsx`, `acoes.ts`
  - `e2e/produtos.spec.ts`, primeira parte
- Modificar: `e2e/apoio/supabase.ts`, com `criarProdutoTeste(dados): Promise<{ produtoId: string; variacaoId: string }>` via `criar_produto` usando o cliente de serviço

**Interfaces:**
- Consome: `buscar_produtos` (RPC), `criar_produto` (RPC), `formatarMoeda` e `gtinValido`.
- Produz:
  - a rota `/produtos`, com parâmetros `?q=&categoria=&situacao=&tipo=&validade=&material=&pagina=` e 50 itens por página;
  - a ação `criarProduto(estado, formData)`, que redireciona para `/produtos/{id}`.

- [ ] **Passo 1: escrever os testes de tela que falham.**

```ts
test('administrador cria produto e cai na ficha com código P000001 e situação Incompleto') // 'Para ficar ativo falta: variação ativa com forma de venda, categoria, foto, NCM.'
test('NCM com 7 dígitos mostra a mensagem')                                                // 'O NCM precisa ter 8 dígitos.'
test('código de barras inválido mostra a mensagem')                                        // 'Código de barras inválido.'
test('lista mostra o produto com situação e menor preço; busca "caixa" acha "Caixa para bolo"')
test('funcionária vê a lista sem o botão Novo produto')
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
  - **Formulário de produto novo:**
    - nome, descrição, tipo de venda (Por unidade / Por peso), controla validade, NCM, CEST, origem fiscal;
    - as 4 propriedades, categorias (caixas de seleção da árvore) e materiais;
    - a primeira variação: nome (padrão "Padrão"), código interno (vazio = gerado) e código de barras.
  - **Validação no app** antes do RPC (NCM, CEST, GTIN); o banco valida de novo.
  - **Lista:**
    - tabela com nome, situação, tipo, quantidade de variações e "a partir de R$ x";
    - caixas de seleção, usadas na Task 9;
    - paginação com `Anterior` e `Próxima`.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a lista de produtos e o cadastro de produto novo`.

### Task 7: Ficha do produto: dados, variações, grade e formas de venda

**Arquivos:**
- Criar:
  - `src/app/(painel)/produtos/[id]/page.tsx`, `acoes.ts`, `dados-gerais.tsx`, `variacoes.tsx`, `grade.tsx`, `formas-venda.tsx`
  - `e2e/produtos.spec.ts`, segunda parte

**Interfaces:**
- Consome:
  - a view `produtos_com_situacao`;
  - `lerGrade`, `combinacoesDaGrade`, `reaisParaCentavos`, `formatarReais` e `mensagemDoErroDoBanco`.
- Produz as ações, que devolvem `ResultadoAcao` ou `EstadoFormulario` com `valores` em caso de erro, como no plano 1.1:
  - `salvarDadosGerais(produtoId, estado, formData)`
  - `salvarVariacao(produtoId, estado, formData)` (criar ou editar)
  - `alterarVariacaoAtiva(variacaoId, ativa)`
  - `gerarGrade(produtoId, estado, formData)`, que devolve `{ sucesso: mensagemGradeCriada(n) | MENSAGENS.gradeSemNovidade }`
  - `salvarFormaVenda(variacaoId, estado, formData)`
  - `alterarFormaAtiva(formaId, ativa)`
  - `salvarFaixa(formaId, estado, formData)`
  - `apagarFaixa(faixaId)`
  - `salvarPrecoPorKg(variacaoId, estado, formData)`, que cria ou atualiza a forma `Granel` (fator 1000)

- [ ] **Passo 1: escrever os testes de tela que falham.**

```ts
test('grade Tamanho 4,6,12 × Cor marrom,branca cria 6 variações; repetir não duplica') // '6 variação(ões) criada(s).' → 'Nenhuma variação nova: todas as combinações já existiam.'; continua com 6 linhas + Padrão
test('forma Pacote com 100 a R$ 6,00 com faixa 10+ a R$ 5,40; faixa 20+ a R$ 5,50 é recusada') // texto da faixa fora de ordem
test('produto por peso mostra Preço por kg e salva R$ 32,00/kg')
test('trocar para Por peso com forma Pacote com 100 é recusado')                       // texto do tipo de venda em conflito
test('código de barras repetido em outra variação mostra a mensagem')                  // 'Este código de barras já está em outra variação.'
test('funcionária abre a ficha e não vê nenhum botão Salvar')                           // getByRole('button', { name: /Salvar/ }) com toHaveCount(0)
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
  - **Ficha:** em seções (Dados, Variações, Formas de venda por variação, Fotos e Compatibilidades), com o selo da situação e a frase de pendências no topo.
  - **Produto por peso:** em cada variação, só um campo `Preço por kg (R$)`, em vez da lista de formas.
  - **Grade:** cria só as combinações cujo `atributos` ainda não exista entre as variações do produto (comparando o jsonb).
  - **Edição:** os componentes de edição só aparecem se `usuario.papel === 'administrador'`.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona a ficha do produto com variações, grade e formas de venda`.

### Task 8: Fotos, compatibilidades e situação

**Arquivos:**
- Criar: `src/app/(painel)/produtos/[id]/fotos.tsx`, `compatibilidades.tsx`; `e2e/produtos.spec.ts`, terceira parte
- Modificar: `src/app/(painel)/produtos/[id]/acoes.ts`, `next.config.ts` (`images.remotePatterns` para `*.supabase.co` e `127.0.0.1:54321`)

**Interfaces:**
- Consome:
  - `problemaDaFoto` e `mensagemDoErroDoBanco`;
  - o bucket `fotos-produtos` e `criarClienteNavegador()`.
- Produz as ações:
  - `registrarFoto(produtoId, caminho)`, que insere em `fotos` com ordem igual ao último + 1;
  - `apagarFoto(fotoId)`, que apaga a linha e o arquivo;
  - `moverFoto(fotoId, direcao: 'antes' | 'depois')`;
  - `ligarCompatibilidade(variacaoId, estado, formData)` (código interno da outra variação mais descrição);
  - `desligarCompatibilidade(id)`;
  - `alterarInativo(produtoId, inativo)`.

- [ ] **Passo 1: escrever os testes de tela que falham.** As imagens são geradas em memória com `setInputFiles({ name, mimeType, buffer })`.

```ts
test('produto completo fica Ativo; apagar a foto volta a Incompleto')          // NCM + categoria + forma + foto → selo 'Ativo'
test('Inativar prevalece mesmo completo; Reativar volta a Ativo')
test('foto de 6 MB e PDF mostram as mensagens e não aparecem na lista')
test('9ª foto mostra a mensagem')                                               // 'Cada produto pode ter até 8 fotos.'
test('compatibilidade tampa ↔ pote aparece nas duas fichas; repetir mostra a mensagem') // 'Estas variações já estão ligadas.'
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
  - **Envio da foto:** a validação (`problemaDaFoto`) acontece antes do envio. O upload sai do navegador para `fotos-produtos/<produtoId>/<crypto.randomUUID()>.<ext>`; depois a ação `registrarFoto` grava a linha.
  - **Se `registrarFoto` falhar**, por exemplo na 9ª foto, o navegador apaga o arquivo enviado e mostra a mensagem.
  - **Exibição:** as fotos aparecem com `next/image` e `unoptimized`, para não gastar a cota de imagens da Vercel.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona fotos, compatibilidades e situação na ficha do produto`.

### Task 9: Busca, filtros e edição em massa

**Arquivos:**
- Criar: `src/app/(painel)/produtos/acoes-massa.ts`, `barra-acoes-massa.tsx`; `e2e/produtos-massa.spec.ts`
- Modificar: `src/app/(painel)/produtos/tabela-produtos.tsx`, `filtros-produtos.tsx`

**Interfaces:**
- Consome: `reajustar_precos`, `alterar_categoria_em_massa`, `alterar_inativo_em_massa`, `lerPercentual` e `mensagemReajuste`.
- Produz as ações, que devolvem `{ erro: string; sucesso: string }`:
  - `reajustarEmMassa(ids: string[], percentualTexto: string)`
  - `categoriaEmMassa(ids: string[], categoriaId: string, incluir: boolean)`
  - `inativarEmMassa(ids: string[], inativo: boolean)`

- [ ] **Passo 1: escrever os testes de tela que falham.**

```ts
test('busca sem acento e por código de barras; filtro por categoria inclui subcategorias')
test('reajuste de 10% em 2 produtos: R$ 6,00 → R$ 6,60 e faixa R$ 5,40 → R$ 5,94')     // 'Reajuste aplicado em 2 produto(s).'
test('reajuste de -50% que empataria faixas mostra a mensagem e não muda nenhum preço')
test('sem selecionar nada, a barra mostra a mensagem')                                  // 'Selecione pelo menos um produto.'
test('incluir categoria e inativar em massa refletem nos filtros')
```

- [ ] **Passo 2:** enviar e confirmar no CI que FALHAM.
- [ ] **Passo 3:** implementar.
  - **Barra de ações em massa** (só para o administrador), que aparece acima da tabela: campo `Reajuste (%)` com botão `Aplicar reajuste`, `select` de categoria com os botões `Incluir categoria` e `Remover categoria`, e os botões `Inativar` e `Reativar`.
  - **Filtros:** são um formulário GET, e a URL guarda o estado.
- [ ] **Passo 4:** enviar e confirmar no CI que PASSAM.
- [ ] **Passo 5:** commit com `Adiciona busca, filtros e edição em massa de produtos`.

### Task 10: Manual e fechamento

**Arquivos:**
- Criar: `docs/manual/cadastrar-produto.md` (produto, variações, grade, formas de venda, faixas, granel, fotos, compatibilidade, situação), `docs/manual/categorias-e-materiais.md`, `docs/manual/edicao-em-massa.md`
- Modificar: `README.md` (situação do plano 1.2 e links do manual)

- [ ] **Passo 1:** escrever os 3 manuais em português simples, com os textos exatos dos botões.
- [ ] **Passo 2:** rodar `npm test && npm run lint && npm run typecheck && npm run build` e confirmar que o CI ficou verde (todos os testes de banco e de tela).
- [ ] **Passo 3:** commit com `Adiciona o manual do catálogo`.
- [ ] **Passo 4:** fazer a revisão final do branch inteiro; depois, com a aprovação do usuário, juntar no `main` e conferir o site principal.
