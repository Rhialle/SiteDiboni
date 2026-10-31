# Plano 1.6 (inventário): registro da execução

Registro gravado durante a execução do [plano 1.6](2026-10-29-fase-1-6-inventario.md): decisões tomadas fora do plano (`Ruling:`), com o motivo e o custo se estiver errada; evidências de teste de cada tarefa; achados da revisão final e melhorias pequenas deixadas para depois (`minor (deferred)`).

Concluído no ramo `fase-1-6-inventario` em 2026-10-31: CI verde (438 testes de banco, 147 unitários, 15 de concorrência, 108 de tela); as 2 migrações do inventário aplicadas no banco de teste.

```text
# SDD ledger — plan: docs/superpowers/plans/2026-10-29-fase-1-6-inventario.md
Spec: docs/superpowers/specs/2026-10-21-fase-1-base-design.md (seções 2, 6.3, 7, 8, 10.8, 11, 12 lidas).
Pre-flight: T1→T2 (variacoes_do_inventario, situações e a trava da linha do inventário) — ok.
Pre-flight: T2→T5/T6 (itens_para_contar, contar_item, revisao_inventario, resumo_inventario, aprovar_inventario) e T1→T4/T6 (abrir_inventario, encerrar/reabrir/cancelar) — ok.
Pre-flight: T3→T5 (somarContagem com unidadesDeDigitacao do plano 1.3) — ok.
Ruling: os testes que falham da Task N+1 vão no mesmo envio que a implementação da Task N (prática dos planos 1.3 a 1.5) — custo se errado: um ciclo a mais.
Ruling: a Task 3 (só unitários) é feita enquanto o CI das Tasks 1 e 2 roda — não depende do banco — custo se errado: nenhum.
Ruling: TDD e execução em linha seguem os roteiros já carregados nesta sessão (planos 1.4 e 1.5), sem recarregar — custo se errado: nenhum.
Task 3: evidência local — RED (módulos ./contagem e ./preco inexistentes) → 10/10 verdes; unitários 147/147; lint e tipos ok.
Task 3: Ruling: os textos do inventário entraram em mensagens.ts nesta tarefa (os do app); os que só o banco mostra ficam nas funções do banco — custo se errado: nenhum.
Task 3: complete (commits 45beb79..577aa17, tests: npm test →              at least ~2.83s faster with isolate: false — reuses workers across files instead of one per file)
Task 1: evidência CI — run 41153886113 RED: 22_inventario_estrutura parou na linha 22 (relação inventarios inexistente).
Task 1: Ruling: inventario_itens só é lido pelo administrador (o plano dizia usuário ativo), porque guarda o saldo do momento; quem conta usa itens_para_contar e resumo_inventario — custo se errado: nenhum (a funcionária não precisa da tabela).
Task 1: Ruling: as colunas de usuário (aberto_por, decidido_por, contado_por) não têm chave estrangeira, como nas notas: os testes apagam os usuários antes do estoque — custo se errado: um id de usuário apagado fica sem nome na tela.
Task 1: Ruling: texto novo "Este inventário já foi aprovado ou cancelado." para cancelar um que já terminou; função interna travar_inventario; a corrida de dois administradores abrindo ao mesmo tempo esbarra no índice e vira o mesmo texto do "já existe um em andamento" — custo se errado: trocar texto.
Task 2: Ruling: a mensagem da R1 leva a unidade ("o ajuste de -28 un deixaria o saldo negativo (há 25 un agora)"), mais clara que só o número da tabela do plano — custo se errado: trocar texto.
Task 1: evidência CI — run 41155111577: 22_inventario_estrutura ok (23/23); tela 96/96; tipos baixados do artefato. O intervalo inclui a Task 3 (577aa17) e os testes da Task 2 (5f09aef).
Task 2: evidência CI — run 41155111577 RED: 23 parou na linha 35 (itens_para_contar inexistente); concorrência 0/3 (contar_item inexistente).
Task 1: complete (commits 8309dc1..6eac9df, tests: npm test →              at least ~3.38s faster with isolate: false — reuses workers across files instead of one per file)
Task 2: Ruling: resumo_inventario devolve com_diferenca a qualquer usuário ativo (é só uma contagem, sem saldo); a tela da funcionária não mostra esse número — custo se errado: a funcionária poderia saber quantos itens diferem, não quais nem quanto.
Task 2: evidência CI — run 41156162162: concorrência 3/3 verde; 23 passou 21 conferências e parou na linha 90 por defeito do teste (perda com quantidade positiva: "Perda e quebra só tiram do estoque."); corrigido para -5. A Task 2 só fecha com o 23 verde no próximo envio.
Task 4: evidência RED — CI 41156162162: os 3 testes falham sem a página (título "Inventário", campo "Descrição" e link do menu inexistentes).
Task 2: evidência CI — run 41157595375: 23_inventario_contagem ok (35/35), banco 438/438, concorrência do inventário 3/3; tipos baixados.
Task 4: evidência GREEN — CI 41157595375: os 3 testes de lista e abertura passam; tela 99 no total.
Task 5: evidência RED — CI 41157595375: os 4 testes falham sem a página /inventario/[id] (formulários de contagem inexistentes).
Task 2: complete (commits 6eac9df..35e926b, tests: npm test →              at least ~4.18s faster with isolate: false — reuses workers across files instead of one per file)
Task 4: complete (commits 9360456..35e926b, tests: npm test →              at least ~3.23s faster with isolate: false — reuses workers across files instead of one per file)
Task 5: Ruling: os botões do administrador (encerrar e cancelar) ficam na Task 6, que tem as ações; a Task 5 entrega a busca e os formulários de contagem — custo se errado: nenhum.
Task 5: Ruling: o teste da contagem às cegas usa código interno fixo (FM-1): o código gerado (P000137) poderia conter o número procurado — custo se errado: nenhum.
Task 5: evidência GREEN — CI 41159021918: os 4 testes da contagem passam (inclusive às cegas); tela 103 no total.
Task 6: evidência RED — CI 41159021918: os 5 testes falham sem os botões (Encerrar contagem, Cancelar inventário) e sem o aviso da funcionária.
Task 5: complete (commits 35e926b..7ea9bab, tests: npm test →              at least ~3.71s faster with isolate: false — reuses workers across files instead of one per file)
Task 6: evidência GREEN — CI 41160470762 todo verde: os 5 testes de revisão, aprovação e cancelamento passam; tela 108/108; banco-teste aplicou as migrações.
Task 6: Ruling: o resumo (com o tempo da primeira e da última contagem) aparece depois de encerrada a contagem; a funcionária vê o resumo sem o número de diferenças, e em revisão vê só "Em revisão pelo administrador." — custo se errado: nenhum.
Task 6: complete (commits 7ea9bab..02ad42d, tests: npm test →              at least ~3.02s faster with isolate: false — reuses workers across files instead of one per file)
Final review: self-review (subagente só a pedido do usuário) — ramo main...fase-1-6-inventario: migrações, funções, ações, telas e os 5 pontos de atenção (cada um com teste de banco, concorrência ou tela, todos verdes). Nenhum achado Crítico ou Importante; sem rodada de correção.
Final: minor (deferred): a contagem às cegas vale na tela de contagem; a tela Estoque continua mostrando o saldo para todos (o manual pede para contar pela prateleira).
Final: minor (deferred): a busca da contagem mostra no máximo 30 variações, sem aviso de que há mais; no escopo da loja inteira é preciso buscar pelo nome ou código.
Final: minor (deferred): a revisão mostra quantas variações do escopo não foram contadas, mas não lista quais.
Final: minor (deferred): os testes de preço por peso e por faixas existem, mas as funções só serão usadas na venda (fases 2 e 3).
Task 7: evidência CI — run 41161666334 todo verde (banco 438, unitários 147, concorrência 15, tela 108); manual docs/manual/inventario.md, README e estoque.md.
Task 7: complete (commits 02ad42d..ad0890e, tests: npm test →              at least ~2.47s faster with isolate: false — reuses workers across files instead of one per file)
```
