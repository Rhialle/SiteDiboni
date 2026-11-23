# Plano 2.1 (caixa e venda): registro da execução

Registro gravado durante a execução do [plano 2.1](2026-11-22-fase-2-1-caixa-e-venda.md): evidências de teste, decisões tomadas fora do plano (`Ruling:`), a revisão final e o que ficou para depois (`minor (deferred)`).

## Resultado

Ramo `fase-2-1-caixa-e-venda`. Migrações novas: `20261123120000_balcao_tipos`, `20261123130000_balcao_caixa`, `20261123140000_formas_codigo_barras`, `20261123150000_balcao_venda` e `20261123160000_balcao_avisos`. Telas novas: **Balcão**, **Caixa** (e o fechamento), **Vendas** (lista, detalhe, comprovante) e **Vendas sem saldo**; Início com avisos novos; Configurações com o limite de desconto e a largura do cupom; ficha do produto com o código de barras da forma. Manual novo `docs/manual/balcao.md`.

## Evidências

- **Task 1 (caixa no banco):** RED no CI 45063816304 (`caixa_aberto` inexistente, 27/27) → GREEN no 45065034432 (26 ok).
- **Task 2 (código de barras da forma):** banco RED no 45065034432 → GREEN no 45066187491 (27 ok); tela RED no 45066711705 → GREEN no 45068117967.
- **Task 3 (venda no banco):** RED no 45066187491 (`vendas` inexistente, 43/43; concorrência falhou) → 40/43 no 45066711705 (as 3 falhas eram do teste) → GREEN no 45068117967 (banco 545; concorrência 16/16, inclusive duas vendas da última unidade ao mesmo tempo).
- **Task 4 (cálculo da venda):** RED local (módulo inexistente) → GREEN 12/12.
- **Task 5 (tela do caixa):** RED no 45068117967 (4/4) → 3/4 no 45069201436 → GREEN no 45084033038.
- **Tasks 6 e 7 (balcão, vendas, avisos, configurações):** RED no 45069201436 (balcão 9/9, vendas 3/3, avisos 7/7) → 130/134 no 45071254168 → 132/134 no 45084033038 → 133/134 no 45085331686 → GREEN no 45086388820 (banco 552, tela 134; as migrações foram aplicadas no banco de teste).

## Decisões tomadas fora do plano

- Ramo nesta pasta, sem worktree. Custo se errado: nenhum.
- Os testes que falham de uma tarefa foram no mesmo envio que a implementação da anterior, como nos planos 1.x. Custo se errado: um ciclo a mais.
- A Task 4 foi feita antes das Tasks 2 e 3, porque não depende do banco. Custo se errado: nenhum.
- **O código de barras da forma ficou só na ficha do produto** (a especificação pedia também a planilha): a leitura da planilha exige todas as colunas, e uma coluna nova obrigatória quebraria as planilhas que a loja já tem. Coluna opcional fica para depois. Custo se errado: o administrador digita o código de cada pacote na ficha.
- Uma funcionária que pede o resumo de um caixa que não fechou recebe "Caixa não encontrado." (em vez de "sem permissão"), para não revelar que o caixa existe. Custo se errado: nenhum.
- A venda sem saldo dá entrada da falta com `movimentar_lote` e o custo médio do momento, sem passar por `entrar_no_estoque` (que mudaria o custo médio). Custo se errado: nenhum.
- `estornar_movimentacao` recusa movimentações de venda fora de `cancelar_venda` (marcador da transação `diboni.cancelando_venda`). Custo se errado: nenhum.
- O tipo de `avisos_inicio` foi escrito à mão em `tipos.ts` antes do artefato. Custo se errado: um ciclo.
- No celular, Balcão, Caixa e Vendas ficam no "Mais" (as abas de baixo continuam Início, Produtos, Estoque e Alertas), porque o balcão é no computador. Custo se errado: nenhum.
- **Menu lateral passou a rolar:** com os 3 itens novos, o botão Sair do administrador saía da tela (um teste de estoque travou nisso). Custo se errado: nenhum.
- A tela de venda é desenhada só no navegador (`next/dynamic` sem servidor), para a venda guardada no navegador voltar já no primeiro desenho. Custo se errado: nenhum.
- **Número da venda:** a sequência `vendas_numero` passou a pertencer à coluna `vendas.numero`; sem isso, a limpeza dos testes (`truncate … restart identity`) não recomeçava a numeração, e "Venda nº 10" passava por "Venda nº 1". Editada na migração ainda não aplicada no banco de teste. Custo se errado: nenhum.
- Defeitos dos próprios testes corrigidos: mensagens que somem quando o formulário dá lugar à tela seguinte (caixa aberto, caixa conferido); recarregar antes de o item entrar; Pote sem estoque também é venda sem saldo; ordem por texto no fechamento.
- Depois que a rodada 45086388820 aplicou as migrações no banco de teste, nenhuma migração já aplicada foi editada: a chave da venda foi numa migração nova (`20261123170000_venda_chave`).
- O GitHub derrubou uma rodada antes dos testes por porta ocupada na máquina dele (ambiente); rodou de novo.

## Revisão final

Revisor independente (subagente) sobre b4bcb18..d0aad3a: nada crítico; a parte de dinheiro e estoque no banco foi considerada correta e bem testada (os 5 pontos de atenção do plano conferidos). Cinco pontos importantes, corrigidos com teste que falhou primeiro (CI 45087443574) e passou depois:

1. O detalhe da venda lia a tabela de custos inteira, que passa do limite de 1.000 linhas por consulta: o custo sumiria das vendas novas. Agora lê só os custos das movimentações daquela venda, e só para o administrador.
2. A venda cancelada depois do fechamento não aparecia no caixa (V11). Agora o caixa aberto e o fechamento listam as vendas, e a cancelada depois do fechamento fica marcada; a confirmação do cancelamento explica o que acontece.
3. O campo **Código ou nome** não se limpava com código inexistente nem com bipadas rápidas (os códigos se juntavam). Agora se limpa na hora, e o carrinho é atualizado sem perder item quando as respostas voltam fora de ordem.
4. A venda podia sair em dobro se a internet falhasse na resposta. Agora cada venda tem uma chave: concluir de novo devolve a venda já gravada; a falta de conexão mostra uma mensagem em vez da tela de erro.
5. O campo de desconto em R$ mostrava o desconto da venda anterior. Agora começa vazio em cada venda nova.

Pequenos, deixados para depois (`minor (deferred)`):

- O cancelamento trava os saldos uma variação por vez (e não todas de uma vez, como a R10), e não trava a linha do caixa: com uma venda ou um fechamento ao mesmo tempo, o banco pode desfazer um dos dois com erro (sem estragar dados).
- Falta um índice em `movimentacoes (origem, origem_id)`: a venda, o cancelamento e o detalhe leem a tabela inteira.
- O número da venda pula quando a venda falha depois de gravada a linha (ex.: faltou a validade da embalagem).
- Os itens são gravados na ordem da variação, não na ordem em que foram bipados (o comprovante sai fora da ordem).
- Duas vendas sem saldo ao mesmo tempo de um produto com validade que nunca teve estoque podem esbarrar no mesmo lote VSS (uma falha com erro técnico).
- Na tela de venda: trocar a forma pode criar duas linhas da mesma forma; preço que mudou com a venda guardada só se resolve tirando e bipando o item de novo; o cursor sai do campo de busca depois de mexer na quantidade ou na forma; no pagamento, não dá para tirar uma parte criada por engano, e mexer no carrinho com o pagamento aberto deixa os valores velhos.
- A lista de vendas sem saldo não mostra quem vendeu (com um login só no balcão, pesa pouco); a lista de vendas não filtra por caixa; o extrato do estoque mostra **Estornar** em movimentações de venda (o botão dá a mensagem de que só sai pelo cancelamento).
- A busca por nome não trata `%` e `_` digitados.
