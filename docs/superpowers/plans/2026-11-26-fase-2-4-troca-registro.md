# Plano 2.4 (troca): registro da execução

Registro gravado durante a execução do [plano 2.4](2026-11-26-fase-2-4-troca.md): evidências de teste, decisões tomadas fora do plano (`Ruling:`), a revisão final e o que ficou para depois (`minor (deferred)`).

## Resultado

Ramo `fase-2-4-troca`. Migrações novas: `20261126120000_troca_tipos` (tipo `entrada_troca`), `20261126130000_troca` (coluna `vendas.devolvido_centavos`, tabela `venda_devolucoes`, `preco_da_devolucao`, `registrar_venda` com `p_devolvidos` e `p_devolvido_centavos`, `buscar_para_venda` com `p_devolucao`) e `20261126140000_troca_cancelamento` (`cancelar_venda` e `estornar_movimentacao` com a entrada de troca). Telas: **Balcão** com o botão **Troca**, a parte **Devolvido** e **A pagar**; **Vendas** (lista com o selo **Troca** e a coluna **Pago**, detalhe e comprovante com o devolvido); **Caixa** com as trocas à parte. Manual `docs/manual/balcao.md` com a seção **Troca**.

## Evidências

- **Task 1 (registrar a troca no banco):** RED no CI 45909452988 (`registrar_venda` sem `p_devolvidos`, 29/29) → dois defeitos do próprio teste no 45910828092 → GREEN no 45912106343 (banco 586; o 31 com 29/29). A etapa de tipos do CI acusou só `preco_da_devolucao`: `tipos.ts` trocado pelo artefato.
- **Task 2 (cancelar a troca):** RED no 45913542702 (5/36: o cancelamento não estornava a entrada do devolvido) → GREEN no 45914942805 (banco 593; o 31 com 36/36).
- **Task 3 (contas da tela):** RED local (7 testes, funções inexistentes) → GREEN 19/19.
- **Task 4 (balcão):** RED no 45914942805 (os 5 testes de tela da troca; os outros 145 passaram) → GREEN no 45916684124 (tela 150).
- **Task 5 (vendas, comprovante, caixa):** RED no 45916684124 (2 testes) → GREEN no 45918287194 (tela 152, banco 593; as migrações foram aplicadas no banco de teste).

## Decisões tomadas fora do plano

- Ramo nesta pasta, sem worktree, como nas fases anteriores. Custo se errado: nenhum.
- O caso "mesma variação devolvida e levada" usa 80 Unidades (R$ 16,00) contra 1 Pacote devolvido (R$ 15,00), e não 2 Unidades: 2 Unidades valem menos que o Pacote e a regra T4 recusaria. Custo se errado: nenhum.
- O motivo da entrada de troca é conferido com o número da venda lido de volta: a sequência do número não volta com o `rollback` dos testes de banco. Custo se errado: nenhum.
- A Task 3 foi feita enquanto o CI da Task 1 rodava (não depende do banco). Custo se errado: nenhum.
- O teste da mensagem "Faltam…" usa o espaço inseparável que o formatador de moeda põe depois de "R$"; o teste antigo do envio da venda ganhou os dois campos novos. Custo se errado: nenhum.
- Defeitos do próprio teste de banco: a funcionária não executa `esperado_do_caixa` nem lê custos, e o teste do custo passava comparando vazio com vazio. Agora o custo (R$ 0,05, explícito) e o esperado são conferidos fora da sessão dela. Custo se errado: nenhum.
- O resumo de pagamento do detalhe da venda ganhou o nome **Resumo da venda** (para o teste achar Troca e Dinheiro), e o comprovante mostra também **A pagar** depois da troca. Custo se errado: nenhum.
- O campo **Validade da embalagem** do devolvido aparece quando o produto controla validade e não há saldo válido; se houver um lote válido com saldo zero, o banco usa esse lote e ignora a validade informada (a mesma regra da venda sem saldo). Custo se errado: nenhum.

## Revisão final

Revisor independente (subagente) sobre 6ab7a9f..f9968f9: nada crítico. O banco foi considerado sólido (ordem de trava, chave, recálculo do devolvido, cancelamento) e os 5 pontos de atenção do plano conferidos no código e nos testes; nenhum outro lugar trata o total da venda como dinheiro recebido. Corrigidos com teste de tela que falhou primeiro (CI 45920223323) e passou depois (CI 45921637394: banco 593, tela 154):

1. **(Importante) O pagamento aberto ficava com os valores velhos quando o devolvido mudava:** a tela mostrava "Nada a pagar" com uma linha de R$ 15,00 em dinheiro e **Concluir venda** desligado. Agora mexer nos itens, no devolvido ou no desconto fecha o pagamento; **Receber** monta de novo com o valor a pagar certo.
2. **(Pequeno, promovido a importante) Com a troca aberta, a câmera só alimentava a venda:** o produto devolvido lido pela câmera entraria como levado, e o cliente pagaria a mais. Agora a parte **Devolvido** tem a própria **Câmera**.

Pequenos, deixados para depois (`minor (deferred)`):

- A venda e o devolvido dividem a lista de formas de cada variação: a última busca troca a lista (uma forma inativa some do devolvido ou aparece na venda, onde o banco recusa com "não está à venda").
- Os erros da busca do devolvido aparecem embaixo do campo da venda.
- A **Validade da embalagem** do devolvido aparece também quando há um lote válido com saldo zero, e aí o banco ignora a data digitada.
- O cancelamento trava os saldos uma variação por vez (já era assim na 2.1); com uma venda das mesmas variações ao mesmo tempo, o banco pode desfazer uma das duas com erro, sem estragar dados. Juntar com a próxima migração.
- A busca do devolvido (texto e resultados) não se limpa ao concluir ou descartar.
- Na lista de vendas, a troca sem diferença mostra "—" na coluna Pagamento (o selo **Troca** aparece).
