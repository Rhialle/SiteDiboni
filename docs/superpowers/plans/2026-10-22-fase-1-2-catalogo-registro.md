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
