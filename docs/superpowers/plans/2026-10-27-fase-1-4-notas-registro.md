# Plano 1.4 (notas de entrada): registro da execução

Registro gravado durante a execução do [plano 1.4](2026-10-27-fase-1-4-notas.md): decisões tomadas fora do plano (`Ruling:`), com o motivo e o custo se estiver errada; evidências de teste de cada tarefa; achados da revisão final e melhorias pequenas deixadas para depois (`minor (deferred)`).

Concluído no ramo `fase-1-4-notas` em 2026-10-28: CI verde (340 testes de banco, 96 unitários, 12 de concorrência, 91 de tela); as 4 migrações das notas aplicadas no banco de teste.

Correção de um `Ruling` antigo: o tipo do aviso de notas no Início ficou `"notas"` (não `"notasAguardando"`), como os outros tipos curtos.

```text
# SDD ledger — plan: docs/superpowers/plans/2026-10-27-fase-1-4-notas.md
Spec: docs/superpowers/specs/2026-10-21-fase-1-base-design.md (seções 6.2, 7, 8, 9.1, 10.2, 10.3, 10.5, 11, 12).
Pre-flight: T1→T2/T3/T4 (tabelas e enum situacao_nota): nomes iguais nos blocos Produz/Consome — ok.
Pre-flight: T2→T3 (aplicar_ligacao_item interna, usada por ligar_item_nota) — ok. T3 usa entrar_no_estoque do plano 1.3 com a assinatura real (p_variacao, p_quantidade, p_custo_unitario, p_validade, p_codigo_lote, p_tipo, p_motivo, p_usuario, p_origem, p_origem_id) — ok.
Pre-flight: T5→T6 (lerNotaXml, paraDadosDeImportacao; o formato de dados é o de importar_nota da T2) — ok. T4→T9 (avisos_inicio com notas_aguardando) — ok.
Ruling: o visual novo do painel (a01d5aa, feito em paralelo e juntado no main em 2026-10-28) muda três pontos do plano: (1) o menu mora em src/components/painel/navegacao.ts e o layout monta a lista — o link "Notas" da Task 6 entra ali; (2) avisosDoInicio devolve { tipo, quantidade, resto, texto, link } e o Início desenha cartas por tipo — o aviso da Task 9 ganha o tipo "notasAguardando" e uma carta; (3) as telas novas seguem DESIGN.md (vidro, campo-escolha, MensagemDeSucesso, Selo) — custo se errado: telas fora do padrão visual.
Ruling: o ramo fase-1-4-notas foi refeito sobre o main com o visual novo (rebase do commit do plano, que não tinha sido enviado) — custo se errado: nenhum.
Ruling: os testes que falham da Task N+1 vão no mesmo envio que a implementação da Task N (mesma prática do plano 1.3) — custo se errado: um ciclo a mais.
Task 1: evidência CI — run 40755530873 RED (relação fornecedores inexistente).
Task 1: Ruling: o bucket notas-xml também deixa quem enviou ler o próprio arquivo (além de apagar) — a remoção do Storage pode precisar ler a linha; o XML é de quem enviou — custo se errado: nenhum (só o próprio arquivo).
Task 1: evidência CI — run 40757783465: 16_notas_estrutura ok (17/17); testes de tela e concorrência verdes com a limpeza nova.
Task 2: evidência CI — run 40757783465 RED (importar_nota inexistente).
Task 1: complete (commits c34c00c..95b84dc, tests: npm test →              at least ~2.53s faster with isolate: false — reuses workers across files instead of one per file)
Task 2: Ruling: função nova quantidade_para_mensagem ('2.5000' → '2,5') para o texto da R6 — custo se errado: nenhum.
Task 3: Ruling: texto novo 'Este item ainda não está ligado: o administrador precisa ligá-lo.' (recebimento de item sem ligação) — custo se errado: trocar texto.
Task 2: evidência CI — run 40759106561: 17_notas_importacao ok (19/19).
Task 3: evidência CI — run 40759106561 RED (ligar_item_nota, salvar_recebimento_item, confirmar_nota e descartar_nota inexistentes; concorrência das notas falhou igual).
Task 2: complete (commits 95b84dc..de4e9d7, tests: npm test →              at least ~2.14s faster with isolate: false — reuses workers across files instead of one per file)
Task 3: Ruling: funções internas travar_nota_aberta (trava e recusa nota confirmada ou descartada) e conferir_lotes_item (validade e soma dos lotes), usadas por várias funções — custo se errado: nenhum.
Task 3: evidência CI — run 40760603605: 18_notas_confirmacao ok (25/25); concorrência das notas 2/2 (confirmação dupla e importação dupla).
Task 4: evidência CI — run 40760603605 RED (divergencias_fornecedor inexistente).
Task 3: complete (commits de4e9d7..fe2a917, tests: npm test →              at least ~2.05s faster with isolate: false — reuses workers across files instead of one per file)
Task 4: evidência CI — run 40761979991: 19_notas_consultas ok (7/7); banco 340/340, concorrência 12/12, tela 74/74; só os tipos estavam desatualizados (baixados).
Task 5: bloqueio — a pasta dos XMLs reais não foi informada. Há um NF-e em Downloads (1 item, sem rastro, modelo 55 autorizado); aguardando o usuário confirmar se é modelo e indicar os outros. Tarefas 1–4 (banco) prontas.
Task 4: complete (commits fe2a917..5c7c117, tests: npm test →              at least ~2.06s faster with isolate: false — reuses workers across files instead of one per file)
Task 5: Ruling: os modelos foram escritos do zero copiando só a estrutura da NF-e real de Downloads (uma compra da loja, 1 item, sem rastro), em vez de copiar e trocar os dados do arquivo real — assim nenhum dado real entra no repositório; lote, SEM GTIN, desconto, frete e ICMS-ST vêm de itens inventados, como o plano previa — custo se errado: alguma variação de fornecedor real só aparece no critério de pronto (3 notas reais).
Task 5: evidência local — RED (módulo ./xml inexistente) → 11/11 verde; unitários 87/87, lint e typecheck ok.
Task 5: complete (commits 5c7c117..0dec354, tests: npm test →              at least ~1.85s faster with isolate: false — reuses workers across files instead of one per file)
Task 6: evidência RED — CI 40774090900: os 5 testes de notas falham porque o campo "Arquivos XML" não existe (a página /notas ainda não existe); os outros 74 testes de tela passam; lint, tipos, unitários, banco, concorrência e build verdes.
Task 6: Ruling: na tela, cada arquivo é enviado dentro de try/catch — se a conexão cair ou o envio for recusado, aquele arquivo mostra "Não foi possível concluir" e os próximos continuam (o plano pede que um arquivo com erro não impeça os outros); a ação também recusa argumentos que não sejam texto, porque uma ação do servidor pode ser chamada fora do formulário.
Task 6: Ruling: bodySizeLimit fica em '4mb', como no plano; um XML de exatamente 4 MB pode passar do limite por causa da serialização, mas notas reais têm dezenas de KB — custo se errado: um XML enorme mostra "Não foi possível concluir" em vez de "até 4 MB".
Task 6: evidência GREEN — CI 40775747865: os 5 testes de importação e lista passam; 79 testes de tela passam ao todo; lint, tipos, unitários, banco, concorrência e build verdes. As 5 falhas restantes são os testes da Task 7, enviados no mesmo push (o intervalo do commit abaixo inclui 8ec7470, que só tem esses testes).
Task 7: evidência RED — CI 40775747865: os 5 testes de revisão e ligação falham esperando o título "Nota N" (a página /notas/[id] ainda não existe).
Task 6: complete (commits 0dec354..8ec7470, tests: npm test →              at least ~2.04s faster with isolate: false — reuses workers across files instead of one per file)
Task 7: Ruling: ligarItem segue o padrão das outras ações de formulário (notaId, itemId, _estado, formData) em vez de (notaId, itemId, codigo, fatorTexto), para usar useActionState e devolver o que foi digitado no erro.
Task 7: Ruling: o campo "Código interno ou de barras" procura primeiro pelo código de barras quando só tem números e, se não achar, pelo código interno (variacao_por_codigo).
Task 7: Ruling: criarProdutoDoItem confere a R6 (quantidade e lotes × fator) antes de criar o produto, para não sobrar produto criado à toa; o banco confere de novo na ligação.
Task 7: Ruling: acrescentado "Trocar a ligação" (administrador, nota aberta) nos itens já ligados — uma ligação lembrada do fornecedor com o fator errado (a caixa mudou de 12 para 24) precisa ser corrigida antes de confirmar; usa o mesmo ligar_item_nota — custo se errado: um formulário a mais escondido num details.
Task 8: Ruling: o teste "recebido menor que a nota aparece nas divergências do fornecedor" vai para a Task 9, onde a tela de divergências existe; no lugar, a Task 8 testa que só o recebido entra no estoque.
Task 8: Ruling: o RED do unitário (paraUnidadeBase com 4 casas) foi visto localmente na verificação de tipos (TS2345: 4 não cabe em 0 | 3); ele não vai no push dos testes de tela porque o build do CI confere os tipos e impediria os testes de tela de rodar.
Task 7: evidência GREEN — CI 40777380320: os 5 testes de revisão e ligação passam; 84 testes de tela passam ao todo; o resto do CI verde. O intervalo abaixo inclui 9157073, que só tem os testes da Task 8.
Task 8: evidência RED — CI 40777380320: os 4 testes falham porque o formulário "Recebimento do item N" e os botões "Confirmar nota"/"Descartar nota" não existem; o preparo (importar e ligar os 3 itens) já passa. Unitário: RED local na verificação de tipos (visto antes).
Task 8: Ruling: "Recebido" e lotes são campos controlados (estado no navegador), para o que foi digitado não sumir quando o React limpa o formulário depois da ação; o componente recomeça quando a ligação muda (key com variação e fator).
Task 8: Ruling: Recebido "0" é aceito (o item não chegou; o banco aceita 0); paraUnidadeBase continua recusando zero para o estoque.
Task 8: Ruling: confirmar e descartar ficam para qualquer usuário ativo, como o banco permite (a funcionária confere a mercadoria e confirma); os dois pedem confirmação do navegador.
Task 7: complete (commits 8ec7470..9157073, tests: npm test →              at least ~1.60s faster with isolate: false — reuses workers across files instead of one per file)
Task 8: evidência GREEN — CI 40778983833: os 4 testes de recebimento, confirmação e descarte passam; 88 testes de tela passam ao todo; o resto do CI verde. O intervalo abaixo inclui 08b870e, que só tem os testes da Task 9.
Task 9: evidência RED — CI 40778983833: "Divergências" não existe em /notas; o placeholder da busca ainda é "Nome, código interno ou de barras"; o Início não mostra "1 nota(s) aguardando o administrador". Unitário: RED local (expected [] to deeply equal [{ tipo: 'notas', … }]).
Task 9: Ruling: o aviso de notas aparece no Início de todos (a funcionária também vê que há nota esperando o administrador); a lista de divergências também é de todos — só tem quantidades, nenhum valor.
Task 8: complete (commits 9157073..08b870e, tests: npm test →              at least ~2.01s faster with isolate: false — reuses workers across files instead of one per file)
Task 9: evidência GREEN — CI 40780363465 todo verde: 91 testes de tela, 340 de banco, unitários e concorrência; banco-teste aplicou as migrações. O intervalo abaixo inclui 3c20094 (o manual da Task 10).
Task 10: verificação fora do CI — o leitor leu a NF-e real de Downloads (chave de 44 dígitos, destinatário = CNPJ da loja, 1 item DP com código de barras, NCM e custo) e recusou um XML qualquer como "Arquivo inválido"; só contagens foram mostradas, nada da nota saiu do computador.
Task 10: revisão final — ajustes: linha de lote toda em branco é ignorada ao salvar o recebimento; "Importar notas" sem arquivo mostra "Escolha pelo menos um arquivo XML."; o manual avisa que trocar a ligação volta o recebido e os lotes para os da nota.
Task 9: complete (commits 08b870e..3c20094, tests: npm test →              at least ~1.78s faster with isolate: false — reuses workers across files instead of one per file)
Task 10: evidência CI — run 40781805068 todo verde depois dos ajustes: banco 340/340, unitários 96/96, concorrência 12/12, tela 91/91; banco-teste aplicou as migrações. Local: npm test, lint e typecheck ok.
Task 10: complete (commits 3c20094..fc4e8ef, tests: npm test →              at least ~1.64s faster with isolate: false — reuses workers across files instead of one per file)
```

## Revisão final

Revisão do ramo inteiro (`main...fase-1-4-notas`), com foco no que só a tela faz (o banco foi coberto pelos testes pgTAP e de concorrência das Tasks 1–4):

- **Leitor do XML:** conferido com a NF-e real da loja que está em Downloads (lida sem erro, destinatário igual ao CNPJ da loja) e com um XML qualquer (recusado como inválido). XML com BOM no início passa na validação.
- **Permissões:** a funcionária não recebe nenhum valor (a página nem consulta `notas_entrada_itens_valores` para ela, e o banco também bloqueia); ligar e criar produto exigem administrador na ação e no banco.
- **Ajustes feitos:** linha de lote deixada em branco é ignorada; importar sem arquivo mostra mensagem; o manual explica que trocar a ligação volta o recebido e os lotes para os da nota.

## Deixado para depois

- minor (deferred): a lista de `/notas` mostra as 100 mais recentes, sem paginação. Basta enquanto o volume for pequeno; o filtro de situação ajuda.
- minor (deferred): nota de emitente com CPF (produtor rural) não entra — `fornecedores.cnpj` exige CNPJ — e mostra "Não foi possível concluir". Se aparecer na loja, aceitar CPF no fornecedor.
- minor (deferred): a mensagem da soma dos lotes mostra os números em unidade base sem a unidade ("(1900)", que são gramas). O texto vem do banco, como no plano.
- minor (deferred): se a importação falha e a remoção do XML também falha, o arquivo fica no bucket sem nota. Não aparece em lugar nenhum; só ocupa espaço.
- minor (deferred): "Criar produto e ligar" são duas chamadas (criar e ligar). Se a nota for confirmada em outra aba entre as duas, o produto fica criado e a mensagem diz para ligar pelo código, sem criar de novo.
- Critério de pronto com notas reais: só há uma NF-e real (1 item, sem lote). As outras duas, quando o usuário trouxer, conferem o leitor da mesma forma (só aqui no computador, sem entrar no repositório nem no banco de teste).
