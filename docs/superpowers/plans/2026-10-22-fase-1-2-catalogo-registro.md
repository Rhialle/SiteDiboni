# Plano 1.2 (catálogo): registro da execução

Registro gravado durante a execução do [plano 1.2](2026-10-22-fase-1-2-catalogo.md): decisões tomadas fora do plano (`Ruling:`), com o motivo e o custo se estiver errada; evidências de teste de cada tarefa; e melhorias pequenas deixadas para depois (`minor (deferred)`).

Concluído no ramo `fase-1-2-catalogo` em 2026-10-23: CI verde (97 testes de banco, 56 unitários, 45 de tela).

```text
Spec: docs/superpowers/specs/2026-10-21-fase-1-base-design.md
Setup: branch fase-1-2-catalogo na própria pasta (mesmo motivo do plano 1.1); execução Native aprovada pelo usuário.
Pre-flight:
- T2 consome as tabelas da T1 (produtos, variacoes, categorias) — nomes batem.
- T3 consome de T2 o gatilho adiado faixas_em_ordem (set constraints pelo nome) e a view produtos_com_situacao — batem.
- T4 mapeia nomes de restrição que T1/T2 precisam criar com esses nomes exatos: categorias_nome_por_pai, etiquetas_nome_key, variacoes_codigo_interno_key, variacoes_codigo_barras_key, faixas_preco_quantidade_key, compatibilidades_par_key, produto_categorias_categoria_id_fkey, categorias_categoria_pai_id_fkey, produto_etiquetas_etiqueta_id_fkey — anotado para T1/T2 nomearem explicitamente.
- T5–T9 consomem RPCs de T1/T3 (criar_produto, buscar_produtos, reajustar_precos, alterar_*_em_massa) e mensagens de T4 — nomes batem.
Task 6 (anotado na T1): Ruling: código interno vem de sequência que não volta atrás entre testes; o teste de tela deve conferir o formato /^P\d{6}$/ em vez de P000001 exato (o pgTAP 04 confere P000001 num banco novo) — custo se errado: nenhum.
Task 2 (anotado antes): Ruling: texto novo 'Forma a granel não tem faixas de preço.' para faixa em forma peso_variavel (a tabela do plano não tinha um texto para isso) — custo se errado: trocar texto.
Task 1: evidência CI — run 39891955199 RED (gtin_valido inexistente, 19 falhas) → run 39892452425 'Files=4, Tests=42, Result: PASS'.
Task 1: complete (commits c88cca2..fd2fcb5, tests: npm test →              at least ~439ms faster with isolate: false — reuses workers across files instead of one per file)
Task 2: Ruling: tipos do banco das Tasks 2 e 3 atualizados juntos, depois do verde da Task 3 (o passo de tipos não roda enquanto houver teste de banco falhando) — custo se errado: nenhum.
Task 2: evidência CI — run 39892750762 RED (formas_venda/produtos_com_situacao inexistentes) → run 39893075821: 06 ok, 05 15/16 (bug: CASE com new.forma_venda_id no gatilho de formas_venda) → corrigido com IFs separados na mesma migração (ainda não aplicada na nuvem).
Task 3: evidência CI — run 39893075821 RED (buscar_produtos inexistente; bucket fotos-produtos inexistente).
Task 4: Ruling: Task 4 feita em paralelo à espera do CI das Tasks 2–3 (só testes unitários locais, independentes do banco) — custo se errado: nenhum. Evidência: RED local (5 módulos inexistentes) → 48/48 verde.
Task 5: Ruling: criarProdutoTeste e criarCategoriaTeste entram já na Task 5 (o teste 'categoria com produto não é apagada' precisa deles) e gravam direto nas tabelas com o cliente de serviço — criar_produto exige administrador com duas etapas, que o cliente de serviço não tem — custo se errado: nenhum.
Task 3: run 39893359930 — 08 ok, 07 7/20 e erro 'column reference fator is ambiguous' (variável plpgsql com o nome da coluna) → renomeada para multiplicador na mesma migração (ainda não aplicada na nuvem).
Task 2: evidência CI — run 39893742521: 05 e 06 ok (97/97).
Task 2: complete (commits fd2fcb5..5bbc5fb, tests: npm test →              at least ~1.04s faster with isolate: false — reuses workers across files instead of one per file)
Task 3: evidência CI — run 39893742521: 07 e 08 ok, 'Files=8, Tests=97, Result: PASS'.
Task 3: complete (commits 55b64a3..5bbc5fb, tests: npm test →              at least ~1.08s faster with isolate: false — reuses workers across files instead of one per file)
Task 4: complete (commits 7fc0531..5bbc5fb, tests: npm test →              at least ~1.04s faster with isolate: false — reuses workers across files instead of one per file)
Task 6: Ruling: parâmetros de buscar_produtos ganharam default (nulo; limite 50; deslocamento 0) na própria migração da Task 3, ainda não aplicada na nuvem (nenhum CI do branch passou, então banco-teste não rodou) — os tipos gerados exigiam todos os filtros — custo se errado: nenhum.
Task 5: Ruling: no ci.yml, a conferência de tipos do banco foi para depois dos testes de tela (com if: success() || failure()) — antes, toda mudança de schema custava um ciclo extra porque os testes de tela não rodavam — custo se errado: nenhum (a conferência continua barrando o job).
Task 5: evidência CI — run 39894092834 RED (6 falhas de categorias; 18 antigos ok). Task 6: mesmo run, RED (5 falhas de produtos).
Task 7: Ruling: textos novos fora da tabela do plano — 'Escreva um atributo por linha, assim: Tamanho: 4, 6, 12', 'Informe o preço em reais, por exemplo 6,00.', 'Informe uma quantidade inteira maior que zero.', 'A faixa começa em pelo menos 2.', 'Medidas e capacidade são números inteiros maiores que zero.', 'O estoque mínimo é um número inteiro, zero ou mais.' — custo se errado: trocar texto.
Task 5: evidência CI — run 39895018567: 6/6 de categorias verdes (24 passed no total).
Task 5: complete (commits 5bbc5fb..6770bbc, tests: npm test →              at least ~1.18s faster with isolate: false — reuses workers across files instead of one per file)
Task 8: Ruling: fotos exibidas com <img> simples em vez de next/image unoptimized (mesmo efeito, sem configurar remotePatterns); texto novo 'Nenhuma variação com este código interno.' — custo se errado: nenhum.
Task 6: evidência CI — run 39894092834 RED (5 falhas) → run 39895743806: os 5 de lista/produto novo verdes (30 passed).
Task 7: evidência CI — run 39895743806 RED (5 falhas: campos da ficha inexistentes). O teste 'funcionária não vê botões' passou sem a ficha (negativo; só discrimina depois que a ficha tem botões) — anotado.
Task 6: complete (commits 6770bbc..9ad34a6, tests: npm test →              at least ~1.39s faster with isolate: false — reuses workers across files instead of one per file)
Task 7: run 39896129019 — 5/6 verdes; grade falhou no 2º clique (React limpou o textarea obrigatório depois da ação) → gerarGrade devolve o texto e o campo usa como defaultValue.
Task 8: evidência CI — run 39896129019 RED (5 falhas: fotos, inativar e compatibilidades sem tela).
Task 9: evidência CI — run 39896903450 RED (5 falhas: filtros, caixas de seleção e barra inexistentes).
Task 7: evidência CI — run 39896903450: os 6 testes da ficha verdes (39 passed; falhas só da Task 9 e do teste da 9ª foto).
Task 7: complete (commits 9ad34a6..83a1bf4, tests: npm test →              at least ~1.24s faster with isolate: false — reuses workers across files instead of one per file)
Task 9: run 39897694523 — 97/97 banco, 44/45 tela; os 5 da Task 9 verdes; falhou o teste da Task 6 por ambiguidade ('Incompleto' também é opção do novo filtro) → localizador restrito ao cabeçalho da ficha.
Final review: self-review (o harness só permite subagente quando o usuário pede) — sem achados Critical/Important.
Final: minor (deferred): na lista, 'a partir de' usa o preço normal da forma mais barata e ignora as faixas por quantidade.
Final: minor (deferred): depois de gerar a grade, a variação 'Padrão' continua ativa; é preciso inativá-la à mão se não for vendida.
Final: minor (deferred): ligar compatibilidade busca o código interno com ilike, então % e _ no código funcionam como curinga.
Final: minor (deferred): salvar os dados do produto grava o produto e depois as categorias/materiais em chamadas separadas (não é tudo ou nada).
Final: minor (deferred): filtro de categoria com id malformado na URL dá erro de página em vez de lista vazia.
Final: minor (deferred): se a gravação da linha da foto falhar por rede depois do envio, o arquivo fica sobrando no bucket.
Task 8: evidência CI — run 39898654001: 45/45 tela (fotos, inativar, compatibilidades, 9ª foto).
Task 9: evidência CI — run 39898654001: 45/45 tela (busca, filtros, edição em massa).
Task 10: manual (3 arquivos) e README; CI 39898654001 verde, banco-teste aplicou as 3 migrações do catálogo na nuvem de teste.
Task 8: complete (commits 83a1bf4..4e25af5, tests: npm test →              at least ~1.18s faster with isolate: false — reuses workers across files instead of one per file)
Task 9: complete (commits 83a1bf4..4e25af5, tests: npm test →              at least ~1.15s faster with isolate: false — reuses workers across files instead of one per file)
Task 10: complete (commits 83a1bf4..4e25af5, tests: npm test →              at least ~1.16s faster with isolate: false — reuses workers across files instead of one per file)
```

## Revisão independente e correções (2026-10-26)

Uma revisão independente do commit 46c7afa pediu correções antes de juntar ao `main`: 1 achado P1 e 6 P2. Os 7 foram conferidos no código e confirmados. Dois deles já estavam acima como "minor (deferred)": o salvamento da ficha em chamadas separadas e o `ilike` na compatibilidade. A revisão acertou ao tratá-los como correção obrigatória.

| # | Achado | Correção | Teste que reproduz |
|---|---|---|---|
| 1 (P1) | Seleção em massa sobrevivia à troca de página e de busca; "Selecionar todos" comparava só a quantidade | A tabela recomeça a cada página/busca (key) e só considera os produtos da tela; "todos" confere produto a produto | Tela: 100 produtos, página 2 com 50 linhas |
| 2 | Ficha gravava o produto e depois categorias e materiais, sem ser tudo ou nada; erros de leitura eram ignorados | `atualizar_produto` grava tudo numa transação; um item apagado nesse meio-tempo mostra mensagem própria | Banco (material inexistente não muda nada) e tela (categoria apagada antes de salvar) |
| 3 | Forma por unidade em produto por peso era aceita, também com duas abas | O gatilho recusa e trava o produto (FOR SHARE) | Banco, duas conexões nas duas ordens, e tela com duas abas |
| 4 | Grade podia duplicar combinações com dois cliques | Índice único `variacoes_atributos_por_produto` (atributos não vazios) e `gerar_grade` com `on conflict do nothing` | Banco e duas conexões |
| 5 | Faixas conferidas sem trava: duas transações passavam sem ver uma à outra | `conferir_faixas` trava a forma (FOR NO KEY UPDATE, que não bloqueia a chave estrangeira das faixas) | Duas conexões conferindo ao mesmo tempo; o reajuste em massa com desfazer continua verde |
| 6 | Limite de 8 fotos sem trava e sem cobrir a troca de produto | O gatilho trava o produto antes de contar e vale também para `update of produto_id` | Duas conexões (7 fotos + 2 ao mesmo tempo) e banco (mover foto) |
| 7 | Compatibilidade buscava com `ilike` (`_` e `%` como curinga); erro virava "não encontrada" | Código interno guardado em maiúsculas e sem espaços nas pontas; `variacao_por_codigo` compara o código exato; erro de busca tem mensagem própria | Banco e tela (`%XA`, `TAMPA_A`, `tampaxa`) |

- **Migração nova:** `20261026221500_catalogo_correcoes_revisao.sql`. As anteriores já estavam no banco de teste.
- **Conferência antes das regras de unicidade:** a migração começa conferindo se há combinações de atributos repetidas ou códigos que ficariam iguais em maiúsculas. Se houver, para com a lista e não apaga nada. No banco de teste (consulta só de leitura antes da migração): 0 produtos e 0 variações, nada a reconciliar.
- **Testes de concorrência:** `npm run test:concorrencia` (pasta `concorrencia/`). Cada "aba" é uma conexão `pg` com a sua transação no banco local do CI. O teste espera o comando da segunda aba terminar ou ficar parado na trava da primeira antes de confirmar a primeira. Só assim o teste prova a corrida.
- **CI:** cada verificação roda mesmo se uma anterior falhou (o job continua vermelho), para uma rodada mostrar todas as falhas.

Evidência:
- **Run 40430762954 (vermelho esperado):**
  - unitários: 2 falhas (mensagens novas);
  - banco: 10 falhas no arquivo 09, que parou em `gerar_grade` inexistente;
  - concorrência: 6 de 7 falharam porque a segunda aba conseguiu gravar;
  - tela: 4 falhas, entre elas "Selecionar todos" ainda marcado na página 2.
- **O que o vermelho ensinou:**
  - O primeiro teste de faixas já passava sem a correção (a segunda aba confere depois que a primeira confirmou). Ficou como guarda e o nome diz isso. O segundo, com as duas conferindo ao mesmo tempo, é o que reproduz a corrida.
  - O teste da seleção achava "0 selecionado(s)" dentro de "50 selecionado(s)". Passou a exigir o texto exato.
- **Run 40431633180 (verde):**
  - unitários: 56;
  - banco: 123 (26 novos);
  - concorrência: 7;
  - tela: 49 (4 novos);
  - os tipos gerados batem com os escritos à mão;
  - `banco-teste` aplicou a migração nova na nuvem de teste.
- **Commits:** 0cdae74 (testes), 69d8e54 (ajuste de dois testes), b460aeb (correções) e 3a811b9 (manual).
