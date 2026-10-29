# Plano 1.5 (planilha do catálogo): registro da execução

Registro gravado durante a execução do [plano 1.5](2026-10-28-fase-1-5-planilhas.md): decisões tomadas fora do plano (`Ruling:`), com o motivo e o custo se estiver errada; evidências de teste de cada tarefa; achados da revisão final e melhorias pequenas deixadas para depois (`minor (deferred)`).

Concluído no ramo `fase-1-5-planilhas` em 2026-10-29: CI verde (380 testes de banco, 134 unitários, 12 de concorrência, 96 de tela); as 2 migrações da planilha aplicadas no banco de teste.

```text
# SDD ledger — plan: docs/superpowers/plans/2026-10-28-fase-1-5-planilhas.md
Spec: docs/superpowers/specs/2026-10-21-fase-1-base-design.md (seções 6.1, 8, 9.2, 10.3, 11, 12 lidas).
Pre-flight: T1→T2 (catalogo_para_planilha nos testes da T2; índice formas_venda_nome_por_variacao usado para casar a forma pelo nome) — ok.
Pre-flight: T1→T4 (formato do jsonb de catalogo_para_planilha → paraCatalogoAtual) e T2→T4 (DadosDaImportacao, declarado em tipos.ts na T4) — ok.
Pre-flight: T3→T4 (PlanilhaLida, LinhaVariacao, LinhaForma) — ok. T3/T4→T5 (lerPlanilha, escreverPlanilha, paraCatalogoAtual, conferirPlanilha; ações preverPlanilha/gravarPlanilha, sem choque de nome) — ok. VariacaoAtual estende Omit<LinhaVariacao,"linha">, então a exportação passa direto para escreverPlanilha — ok.
Ruling: os testes que falham da Task N+1 vão no mesmo envio que a implementação da Task N (mesma prática dos planos 1.3 e 1.4) — custo se errado: um ciclo a mais.
Ruling: as Tasks 3 e 4 (só unitários, no computador) são feitas enquanto o CI das Tasks 1 e 2 roda — não dependem do banco em execução, só do formato do jsonb que o plano fixa — custo se errado: ajustar paraCatalogoAtual se o jsonb real sair diferente.
Task 3: evidência local — RED (módulos ./celulas, ./escrever inexistentes) → celulas 14/14 e planilha 8/8 verdes; lint ok; tipos só com os erros do teste da Task 4 (ainda sem módulo).
Task 3: Ruling: npm audit acusa uuid <11.1.1 (moderado, GHSA-w5hq-g745-h8pq: falta conferir o tamanho do buffer em v3/v5/v6 quando se passa buf) vindo do exceljs; o exceljs só chama uuidv4() sem buffer, então o defeito não é alcançado — fica como está, sem override — custo se errado: trocar de biblioteca. Os outros 3 alertas (baixos, deepmerge via shadcn) já existiam.
Task 3: Ruling: além do plano, a leitura aceita NCM com pontos ("4819.10.00"), recusa texto que não seja dígitos/pontos no NCM (para "abc" não virar vazio e apagar o NCM), tira repetidos de categorias e materiais (sem diferença de maiúsculas) e lê TRUE/FALSE do Excel como S/N — custo se errado: nenhum.
Task 3: Ruling: task-done roda o conjunto unitário sem conferir.test.ts, que é o teste vermelho da Task 4 escrito antes (pipeline) — custo se errado: nenhum; a Task 4 roda tudo.
Task 3: complete (commits 9960d5e..777c470, tests: npx vitest run --exclude src/lib/planilha/conferir.test.ts →              at least ~2.29s faster with isolate: false — reuses workers across files instead of one per file)
Task 1: evidência CI — run 40901745116 RED: 20_planilha_exportacao parou na linha 50 (catalogo_para_planilha inexistente); 3 das 4 primeiras falharam (índice inexistente, forma repetida aceita).
Task 1: Ruling: a conferência de repetidos antes do índice (bloco do da migração) não tem teste pgTAP — roda uma vez, com o banco no estado da migração; o teste cobre o índice já criado — custo se errado: a migração falhar com a lista dos repetidos, sem apagar nada.
Task 2: Ruling: o teste "produto que não mudou não ganha linha nova no histórico" vira "não é regravado" (ctid igual): dentro da transação do teste, now() não muda e o histórico não registraria nada mesmo com a regravação — custo se errado: nenhum.
Task 4: evidência local — RED (módulos ./catalogo e ./conferir inexistentes) → conferir 16/16 verde; unitários 134/134; lint e tipos ok.
Task 4: Ruling: a decisão 3 do plano dizia que a linha nova entra no produto existente só se a planilha também traz linhas dele; ficou mais simples e mais útil: a linha nova entra no produto que já existe com o mesmo nome (sem diferença de maiúsculas; o nome da planilha, se ele foi renomeado nela), esteja ele na planilha ou não; nenhum = produto novo; mais de um = erro. Os dois testes do plano continuam valendo — custo se errado: uma linha nova com o nome de um produto antigo vira variação dele em vez de produto novo.
Task 4: Ruling: nomes de categoria, material e forma comparados só sem diferença de maiúsculas (acento conta), como o banco (lower(nome)); a leitura da Task 3 passou a tirar repetidos do mesmo jeito — custo se errado: nenhum.
Task 4: Ruling: os erros de produto ambíguo, código de forma inexistente, tipo e validade travados vão uma vez só (na primeira linha do produto ou da forma), não em todas as linhas — custo se errado: nenhum.
Task 4: complete (commits e4184b5..0eae54f, tests: npm test →              at least ~3.88s faster with isolate: false — reuses workers across files instead of one per file)
Task 1: evidência CI — run 40903913209: 20_planilha_exportacao ok (14/14); tela 91/91; só o 21 (Task 2) e os tipos (função nova) falharam — tipos baixados do artefato.
Task 2: evidência CI — run 40903913209 RED (importar_planilha inexistente: 8 das 9 primeiras falharam); o teste também tinha um defeito (apelido "ctid" é coluna de sistema, linha 73), corrigido para "endereco" antes da implementação.
Task 1: complete (commits 4cc5a60..d8b9b91, tests: npm test →              at least ~2.00s faster with isolate: false — reuses workers across files instead of one per file)
Task 1: nota — o intervalo 4cc5a60..d8b9b91 inclui os commits das Tasks 3 e 4 (feitas durante a espera do CI), registrados nas linhas delas.
Task 2: Ruling: no produto por peso, a forma única da planilha atualiza a forma a granel que já existe (mesmo com outro nome), porque o índice formas_venda_um_granel vale também para formas desativadas e uma granel nova esbarraria nele; o nome da forma só muda quando é outro nome (não por maiúsculas) — custo se errado: renomear a granel pela planilha troca o nome dela.
Task 2: Ruling: o código de barras é esvaziado antes de gravar em todas as variações da chamada que vão trocar de código (não só dentro de um produto), para a troca funcionar até entre produtos; isso deixa no histórico um passo "vazio" antes do código novo — custo se errado: uma linha a mais no histórico de quem trocou de código.
Task 2: evidência CI — run 40905926172: 21_planilha_importacao ok (26/26), banco 380/380; tela 91/91 fora os 5 da Task 5; tipos baixados do artefato.
Task 5: evidência CI — run 40905926172 RED: os 5 testes falham esperando o título "Planilha do catálogo" (página inexistente); o da funcionária não chega a /sem-permissao (404).
Task 2: complete (commits d8b9b91..a4f32e8, tests: npm test →              at least ~2.67s faster with isolate: false — reuses workers across files instead of one per file)
Task 5: Ruling: a tela não usa useActionState: o navegador guarda o arquivo escolhido e manda o mesmo arquivo na prévia e na importação (o React limparia o campo depois da ação); trocar de arquivo limpa a prévia; "Nada a importar" aparece quando a prévia não tem erro nem nada a gravar — custo se errado: nenhum.
Task 5: Ruling: os links de baixar são <a download> comuns (não Link do Next), para o navegador baixar o arquivo da rota; texto novo "Escolha a planilha .xlsx." para conferir sem arquivo — custo se errado: nenhum.
Task 5: evidência GREEN — CI 40908495884 todo verde: os 5 testes da planilha passam; tela 96/96, banco 380/380; banco-teste aplicou as migrações.
Task 5: complete (commits a4f32e8..f01372d, tests: npm test →              at least ~2.66s faster with isolate: false — reuses workers across files instead of one per file)
Task 6: manual docs/manual/planilha-do-catalogo.md e README; npm test, lint e typecheck ok no computador.
Final review: self-review (subagente só a pedido do usuário) — pacote review-15f23fe..6e0f772.diff, em passadas: migrações, leitura, prévia, ações, rotas e tela, com os 5 pontos de atenção do plano. Nenhum achado Crítico ou Importante; sem rodada de correção.
Final: Ruling: o tempo de uma importação muito grande (milhares de linhas) não foi medido; o banco do Supabase corta comandos do usuário logado depois de alguns segundos, e a Vercel também tem limite de tempo — fica como está porque é tudo ou nada (nada se estraga) e dividir a planilha resolve; medir com o catálogo real antes da produção — custo se errado: a primeira carga inteira falhar com "Não foi possível concluir" e precisar ser dividida, ou otimizar a função.
Final: minor (deferred): a tela não confere o tamanho antes de enviar; um arquivo perto de 4 MB pode passar do limite do envio e mostrar "Não foi possível concluir" em vez de "A planilha precisa ter até 4 MB."
Final: minor (deferred): célula de erro do Excel (#N/A, #REF!) é lida como vazia e, como a planilha manda, apaga o valor daquela coluna.
Final: minor (deferred): código interno só de números com zero na frente, digitado como número no Excel, perde o zero e vira outro código (os códigos do sistema começam com P, então só afeta códigos próprios).
Final: minor (deferred): importar_planilha não tira categorias ou materiais repetidos da lista; o app já tira, então só uma chamada feita fora do app esbarraria na repetição (erro, sem gravar nada).
Final: minor (deferred): com erros, o resumo da prévia conta só as linhas sem erro.
Task 6: evidência CI — run 40910940697 todo verde (banco 380, unitários 134, concorrência 12, tela 96); banco-teste aplicou as migrações.
Task 6: complete (commits f01372d..6e0f772, tests: npm test →              at least ~2.05s faster with isolate: false — reuses workers across files instead of one per file)
```
