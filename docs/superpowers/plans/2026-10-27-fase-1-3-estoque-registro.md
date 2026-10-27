# Plano 1.3 (estoque): registro da execução

Registro gravado durante a execução do [plano 1.3](2026-10-27-fase-1-3-estoque.md): decisões tomadas fora do plano (`Ruling:`), com o motivo e o custo se estiver errada; evidências de teste de cada tarefa; achados da revisão final e melhorias pequenas deixadas para depois (`minor (deferred)`).

Concluído no ramo `fase-1-3-estoque` em 2026-10-27: CI verde (272 testes de banco, 74 unitários, 10 de concorrência, 71 de tela); as 6 migrações do estoque aplicadas no banco de teste.

```text
Spec: docs/superpowers/specs/2026-10-21-fase-1-base-design.md (lida; seções 5, 6.3, 6.4, 7, 8, 10, 11, 12).
Pre-flight: T1→T2/T3/T4/T5 (travar_saldos, lote_geral, gerar_codigo_lote, movimentar_lote): assinaturas iguais nos blocos Produz/Consome — ok.
Pre-flight: T2→T4 (custo médio em custos_variacao/movimentacoes_custos para o estorno de entrada) — ok.
Pre-flight: T3/T4→T5 (decidir_solicitacao, estornar_movimentacao usados nos testes de concorrência) — ok.
Pre-flight: T6→T7/T11 (buscar_estoque, alertas_estoque, avisos_inicio) — ok. T2→T7 (entrar_no_estoque no apoio de tela, com p_usuario) — ok.
Pre-flight: T8→T9 (EstadoEstoque) e T1→T11 (e2e/apoio/banco.ts nasce na T1; a T11 só acrescenta funções) — ok.
Ruling: os testes que falham da Task N+1 vão no mesmo envio que a implementação da Task N — cada ciclo do CI custa ~10 min e cada teste continua sendo visto falhar antes do código; enquanto houver teste vermelho o job falha e o banco-teste não aplica as migrações na nuvem, então elas podem ser corrigidas até o último ciclo verde — custo se errado: um ciclo a mais para separar.
Task 1: evidência CI — run 40559038010 RED (lote_geral inexistente; 10 parou na linha 20).
Task 1: Ruling: texto novo 'Este produto não controla validade: o estoque fica num lote só.' (lote diferente de GERAL em produto sem validade) e 'Lote não encontrado.' — só aparecem se alguém tentar gravar fora das funções — custo se errado: trocar texto.
Task 1: evidência CI — run 40560613041: 10_estoque_estrutura ok (35/35); testes de tela e de concorrência verdes com a limpeza nova; tipos baixados do artefato.
Task 1: complete (commits 2c2e756..231193d, tests: npm test →              at least ~4.70s faster with isolate: false — reuses workers across files instead of one per file)
Task 2: evidência CI — run 40560613041 RED (registrar_entrada_manual inexistente; 23 falhas no 11).
Task 2: Ruling: entrar_no_estoque trava a linha da variação (FOR NO KEY UPDATE) antes de escolher o lote — sem isso, duas entradas ao mesmo tempo gerariam o mesmo código ENT e a segunda falharia na repetição — custo se errado: entradas da mesma variação esperam uma a outra.
Task 2: evidência CI — run 40561563995: 11_estoque_entradas ok (29/29); 10 continua ok.
Task 2: complete (commits 231193d..970b37f, tests: npm test →              at least ~1.64s faster with isolate: false — reuses workers across files instead of one per file)
Task 3: evidência CI — run 40561563995 RED (registrar_perda_ou_ajuste inexistente).
Task 3: Ruling: textos novos 'Escolha o lote.' (lote ausente em produto com validade, ou de outra variação) e 'Escolha o tipo: perda, quebra ou ajuste.' (tipo fora dos 4) e a função interna validar_perda_ou_ajuste, usada ao registrar e ao aprovar — custo se errado: trocar texto.
Task 3: run 40562550810 — 12 morreu no teste 2: 'permission denied for view saldo_de' (view temporária criada como dono do banco depois de tests.sair()) → view criada antes, como administradora. Defeito do teste, não do código.
Task 4: evidência CI — run 40562550810 RED (estornar_movimentacao e extrato_movimentacoes inexistentes).
Task 7: Ruling: as funções de quantidade e custo (unitárias, locais) foram feitas durante a espera do CI das Tasks 5–6 — não dependem do banco — custo se errado: nenhum. Evidência: RED local (módulo e formatarCusto inexistentes) → 18/18 verde.
Task 7: Ruling: unidadesDeDigitacao deixa de fora a forma de fator 1 (seria igual a 'unidade(s)') e o ponto só vale como separador de milhar ('1.000'); '1.25' é recusado — custo se errado: aceitar ponto decimal.
Task 3: evidência CI — run 40564726210: 12_estoque_perdas ok (32/32).
Task 4: evidência CI — run 40564726210: 13_estoque_estorno ok (25/25).
Task 5: evidência CI — run 40564726210 RED: 14 parou em retirar_fefo inexistente; concorrência: 'última unidade' falhou (42883); 'dois estornos' e 'duas aprovações' passaram de primeira — as travas já vinham das Tasks 3 e 4 (trava dos saldos antes de conferir o estorno; for update na solicitação). Ficam como guarda; para vê-los falhar seria preciso tirar a trava.
Task 3: complete (commits 970b37f..c53634b, tests: npm test →              at least ~2.60s faster with isolate: false — reuses workers across files instead of one per file)
Task 4: complete (commits 970b37f..c53634b, tests: npm test →              at least ~1.78s faster with isolate: false — reuses workers across files instead of one per file)
Task 5: evidência CI — run 40566018949: 14_estoque_fefo ok (11/11); concorrência 10/10 (inclusive 'duas retiradas da última unidade').
Task 6: evidência CI — run 40566018949 RED (buscar_estoque inexistente).
Task 5: complete (commits c53634b..3ceea4d, tests: npm test →              at least ~2.64s faster with isolate: false — reuses workers across files instead of one per file)
Task 6: evidência CI — run 40567915556: testes do banco todos ok (15_estoque_consultas 17/17, com o pg_cron); o passo de tela falhou só pelos testes novos da Task 7.
Task 7: evidência CI — run 40567915556 RED (4 falhas: link Estoque e páginas inexistentes).
Task 6: complete (commits 3ceea4d..6bbca43, tests: npm test →              at least ~1.42s faster with isolate: false — reuses workers across files instead of one per file)
Task 7: Ruling: o link 'Alertas' do menu entra na Task 11, junto com a página (evita link quebrado nas pré-visualizações); 'Ver extrato' aponta para /estoque/movimentacoes, que nasce na Task 10 — custo se errado: link quebrado no ramo até a Task 10.
Task 7: Ruling: formatarDia (AAAA-MM-DD → dd/mm/aaaa sem Date) e diaEmSaoPaulo (hoje no fuso da loja) entram em formatacao.ts, com testes — new Date('2026-12-26') cairia no dia anterior em São Paulo — custo se errado: nenhum.
Task 7: evidência CI — run 40569036728: os 4 testes de tela da Task 7 verdes (54 passed no total); tipos conferem.
Task 8: evidência CI — run 40569036728 RED (4 falhas: campos da entrada manual inexistentes). 'funcionária não vê o formulário' passou sem o formulário (teste negativo; só discrimina depois que o formulário existe) — anotado.
Task 7: complete (commits 6bbca43..2cd2bde, tests: npm test →              at least ~2.23s faster with isolate: false — reuses workers across files instead of one per file)
Task 8: Ruling: textos novos 'Informe o custo em reais, por exemplo 12,00.' (custo digitado que não é valor) — o texto da tabela é para custo vazio — custo se errado: trocar texto.
Task 8: evidência CI — run 40570160020: os 5 testes de tela da entrada manual verdes (58 passed no total).
Task 9: evidência CI — run 40570160020 RED (5 falhas: formulário 'Perda ou ajuste' e página de solicitações inexistentes).
Task 8: complete (commits 2cd2bde..8a1b454, tests: npm test →              at least ~1.85s faster with isolate: false — reuses workers across files instead of one per file)
Task 9: Ruling: num lote vencido o formulário só oferece 'Perda por vencimento' e 'Ajuste: entrou' (o banco recusaria os outros, R4) — custo se errado: oferecer opções que dão erro.
Task 9: run 40571550451 — 4/5 verdes; 'funcionária passa do limite' registrou a perda: o teste de Configurações deixa limite_ajuste_centavos = 8000 e R$ 75,00 ficava dentro dele → restaurarConfiguracoes() no beforeEach (também nos alertas, por causa dos dias). Defeito de isolamento dos testes, não do código.
Task 10: evidência CI — run 40571550451 RED (4 falhas: página de movimentações inexistente).
Task 11: Ruling: alterarSaldoDireto recebe a variação (lote GERAL) em vez do lote — basta para simular divergência — custo se errado: nenhum.
Task 9: evidência CI — run 40573148760: os 5 testes de perdas e solicitações verdes.
Task 10: evidência CI — run 40573148760: os 4 testes de extrato e estorno verdes (67 passed no total).
Task 11: evidência CI — run 40573148760 RED (3 falhas: link Alertas, página e avisos do Início inexistentes).
Task 9: complete (commits 8a1b454..10b24ae, tests: npm test →              at least ~2.05s faster with isolate: false — reuses workers across files instead of one per file)
Task 10: complete (commits 8a1b454..10b24ae, tests: npm test →              at least ~1.85s faster with isolate: false — reuses workers across files instead of one per file)
Task 11: evidência CI — run 40574235194 VERDE: unitários 72/72, banco 272/272, concorrência 10/10, tela 70/70, tipos conferem; banco-teste aplicou as 6 migrações do estoque na nuvem de teste (com o pg_cron).
Task 11: complete (commits 10b24ae..a638d52, tests: npm test →              at least ~1.45s faster with isolate: false — reuses workers across files instead of one per file)
Final review: self-review (o harness só permite subagente quando o usuário pede) — pacote review-78b5056..ede6e55.diff; foco nos 5 pontos de atenção do plano (todos com teste) e nos tipos de achado da revisão do 1.2 (meio caminho, duas abas, entrada velha).
Final: Important: a unidade enviada pelo formulário que não existe mais (forma inativada em outra aba) cai em 'unidade(s)' sem avisar — 3 caixas viram 3 un e o custo da caixa vira custo por unidade, estragando o custo médio.
Final: Important: /estoque/solicitacoes busca as 200 mais recentes e só depois põe as pendentes primeiro — uma pendente antiga some da lista e não dá para decidir.
Final: Ruling: em Alertas, 'Vencendo' mostra a faixa ('até 7 dias') em cada linha, ordenada pelos dias, em vez de três sub-tabelas — mesma informação, menos rolagem — custo se errado: separar em grupos.
Final: minor (deferred): o código de lote digitado não é normalizado ('l1' e 'L1' viram lotes diferentes).
Final: minor (deferred): a página de solicitações não mostra quem decidiu nem quando.
Final: minor (deferred): a lista de estoque inclui variações e produtos inativos (sem filtro para escondê-los).
Task 12: evidência CI — run 40575445929 VERDE (commit do manual): unitários, banco, concorrência e tela.
Final: fixed unidade que não existe mais — escolherUnidade 'escolha que não existe mais' RED (função inexistente) → GREEN, unitários 74/74.
Final: fixed pendente antiga some — e2e 'pendente antiga continua na lista…' RED no run 40575762670 (linha não encontrada) → GREEN pendente (run seguinte).
Final: fixed pendente antiga some — GREEN no run 40576629702: tudo verde (unitários 74/74, banco 272/272, concorrência 10/10, tela 71/71, tipos conferem, banco-teste ok).
Task 12: complete (commits a638d52..ec1505e, CI run 40576629702 verde)
```
