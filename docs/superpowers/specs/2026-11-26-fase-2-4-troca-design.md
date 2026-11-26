# Fase 2.4: troca no balcão

- **Data:** 2026-11-26
- **Situação:** aprovada em 2026-11-26
- **Parte de:** [fase 2](2026-11-22-fase-2-balcao-design.md), parte 2.4. Constrói sobre a [2.1 (caixa e venda)](2026-11-22-fase-2-balcao-design.md), que está no `main`.

## Por quê

Na loja, o cliente às vezes volta porque pegou o produto errado (outro tamanho, outro modelo) e quer trocar. Hoje o sistema só sabe **cancelar a venda inteira** (só o administrador). Sem a troca, ou a funcionária faz a troca "por fora" e o estoque deixa de bater com a prateleira (o objetivo da fase 2), ou chama o administrador para algo que é rotina.

## Como a loja troca hoje (do usuário)

- O cliente devolve o produto e leva o que queria.
- Se o novo custa **mais**, ele paga a diferença.
- Se o novo custa **menos**, a loja **não devolve dinheiro nem dá crédito**: o cliente completa com outro produto até chegar ao valor do devolvido.
- O valor do devolvido é o **preço da etiqueta**, que é o preço do produto no sistema. Não se procura a venda original.

## Objetivos

1. A funcionária registra a troca no balcão, sozinha: bipa o que volta e o que o cliente leva, e recebe a diferença.
2. O devolvido volta para o estoque; o que ele leva sai do estoque, como numa venda.
3. O caixa continua batendo: a troca só põe na gaveta/maquininha a diferença paga.
4. Comprovante da troca.

## Não objetivos

- Devolver dinheiro ao cliente, ou guardar crédito para depois (decisão do usuário).
- Devolução de produto com defeito ou estragado (não apareceu nos motivos; o devolvido é sempre produto bom para vender).
- Achar a venda original ou conferir que o produto foi comprado na loja.
- Prazo para troca.
- Lista ou aviso no Início para o administrador conferir as trocas (como existe para as vendas sem saldo). Dá para acrescentar depois sem refazer nada. (escolha do Claude, depois da checagem do construtor)

## Anti-objetivos (falharia mesmo funcionando)

- Sair dinheiro da gaveta numa troca.
- O fechamento do caixa contar o valor do devolvido como dinheiro, cartão ou Pix recebido.
- A lista de vendas ou o caixa darem a impressão de que entrou o valor inteiro do que o cliente levou.

## Caminhos considerados

1. **Escolhido (pelo usuário): a troca é uma venda com o devolvido abatendo o pagamento.** O que o cliente leva é uma venda normal da 2.1 (preço por quantidade, desconto com limite, saída pelo vencimento, venda sem saldo, chave contra venda em dobro, comprovante, cancelamento). O devolvido entra no estoque ligado a essa venda, e o valor dele aparece no pagamento como uma parte **Troca**, ao lado de dinheiro, crédito, débito e Pix. O caixa não conta a parte Troca. Troca: aproveita a venda já testada; o total da venda inclui o valor da troca, e por isso a lista e o caixa mostram a troca à parte.
2. **Registro e tela só de troca, separados da venda.** Refaria preço, desconto, saída pelo vencimento, comprovante, cancelamento e somas do caixa: uma segunda 2.1, com risco de as regras divergirem.
3. **Entrada manual no estoque + venda com desconto.** Quase sem código, mas o desconto passa do limite da funcionária (cada troca exigiria o administrador), o estoque entra sem ligação com a venda e os relatórios mostram "desconto" onde houve troca.

## Regras

- **T1. Onde:** na tela do **Balcão**, a venda ganha uma parte **Devolvido** (aberta por um botão **Troca**). Sem devolvido, a venda é exatamente a de hoje.
- **T2. Valor do devolvido:** cada linha devolvida vale o **preço de 1 forma** no catálogo × a quantidade (sem a faixa de preço por quantidade, porque a etiqueta mostra o preço de 1). No granel (peso variável), o preço do kg × as gramas ÷ 1000, meio para cima (a mesma conta de `preco_da_linha`). O preço é recalculado no banco, como na venda (V3). (proposta aceita pelo usuário)
- **T3. Quem:** qualquer usuário ativo (a funcionária sozinha). O desconto da parte que o cliente leva segue o limite de hoje (V4). (proposta aceita)
- **T4. Regra da troca:** o valor do devolvido não pode passar do **total da venda** (depois do desconto). Enquanto passar, a tela mostra "Faltam R$ X para fechar a troca." e não deixa concluir; o banco recusa com a mesma ideia. Quando o devolvido é igual ao total, a venda conclui **sem pagamento**; quando é menor, a diferença é paga com as formas de hoje (V5, com troco no dinheiro).
- **T5. Devolvido sem nada levado:** recusado (seria devolução de dinheiro). Uma troca sempre tem pelo menos um item levado.
- **T6. Estoque do devolvido:** entra com uma movimentação nova `entrada_troca`, com origem na venda (`origem = 'venda'`, `origem_id` = a venda), pelo **custo médio do momento** (não muda o custo médio, como a venda sem saldo). Lote: o mesmo critério da venda sem saldo (`lote_da_venda_sem_saldo`): sem controle de validade, o lote geral; com controle, o lote válido de validade mais longa, e, se não houver, a tela pede a validade da embalagem devolvida e cria um lote. (escolha do Claude: reaproveita a regra testada; custo se errado: o devolvido pode ficar num lote de validade mais longa que a real, e o vencimento dele avisaria tarde) As entradas do devolvido acontecem **antes** das saídas do que o cliente leva: se ele devolve e leva a mesma variação (outra forma), o devolvido já conta como saldo e não aparece venda sem saldo à toa; o aviso de sem saldo da tela também desconta o devolvido. (escolha do Claude, depois da checagem do construtor)
- **T7. Produto que não está mais à venda:** pode ser devolvido (está voltando, não saindo). Só o que o cliente leva precisa estar à venda. Por isso a busca da parte Devolvido traz também os itens inativos (a busca da venda, `buscar_para_venda`, só traz o que está à venda). (escolha do Claude)
- **T8. Tudo ou nada:** a venda, as saídas, as entradas do devolvido e os pagamentos são gravados por uma função do banco só (V1), com a trava de saldos de todas as variações envolvidas, devolvidas e levadas, numa ordem só (R10).
- **T9. Caixa:** a parte Troca **não entra** no esperado de nenhuma forma (`esperado_do_caixa`). A tela do caixa e o fechamento mostram, à parte, quantas trocas houve e o valor devolvido.
- **T10. Lista e detalhe de vendas:** a venda com troca tem a marca **Troca**; o detalhe mostra o devolvido (itens, quantidade, valor) e o pagamento com a parte Troca. Onde a tela soma ou mostra o valor de uma venda como dinheiro recebido (lista de vendas, vendas do caixa, total do dia), aparece o **valor pago de verdade** (total − devolvido), com o devolvido à parte. (escolha do Claude, depois da checagem do construtor)
- **T11. Comprovante:** a parte **Devolvido** (itens e valor) antes do pagamento, e a parte Troca no pagamento.
- **T12. Cancelar uma venda com troca:** como V11 (só o administrador, com motivo), estorna também as entradas do devolvido. Se o devolvido já tiver sido vendido de novo e não houver saldo para estornar a entrada, o cancelamento é recusado com uma mensagem clara (R1: o estoque nunca fica negativo). Como as outras movimentações da venda, a `entrada_troca` não se estorna fora do cancelamento (`estornar_movimentacao` recusa). (escolha do Claude)
- **T13. Venda guardada no navegador:** a parte Devolvido é guardada junto com a venda em andamento (como hoje, para a troca de login do desconto).

## O que fica para quem constrói

- Como guardar a parte Troca no banco: uma forma de pagamento nova `troca` em `venda_pagamentos` ou uma coluna `devolvido_centavos` em `vendas` (o anti-objetivo vale nos dois: `esperado_do_caixa`, `vendas_do_caixa` e os rótulos da tela não podem tratar a troca como dinheiro recebido). Sugestão: coluna em `vendas` e tabela `venda_devolucoes` (variação, forma, quantidade, quantidade_base, preço, total), para não mexer no tipo `forma_pagamento`, que a tela e o fechamento usam em muitos lugares.
- Se `registrar_venda` ganha um parâmetro `p_devolvidos` (nova assinatura, por migração nova; a função atual já está no banco de teste) ou se há uma função `registrar_troca` que reaproveita a lógica.
- O desenho exato da parte Devolvido na tela (seguindo o DESIGN.md) e um atalho de teclado, se fizer sentido.
- O nome exato das mensagens (em `src/lib/mensagens.ts`).
- O tipo novo `entrada_troca` (e `troca`, se for forma de pagamento) vai numa migração própria, antes das funções que o usam (como em `balcao_tipos`).

## Restrições

- Toda escrita por função do banco, tudo ou nada; estorno, nunca apagar (R2); estoque nunca negativo (R1); trava de saldos na ordem (R10).
- Funções já aplicadas no banco de teste mudam por migração nova, sem editar a antiga.
- Telas: componente síncrono com `<Suspense>` em volta do assíncrono; consultas no mesmo `Promise.all` da sessão; textos em `src/lib/mensagens.ts`.
- Dados reais da loja nunca no banco de teste; o repositório é público.

## Como saber que deu certo

- **Banco (pgTAP):** troca com diferença paga (estoque do devolvido sobe, do levado desce, pagamentos = total − devolvido); troca sem diferença (sem pagamento); devolvido maior que o total → recusado; devolvido sem levado → recusado; devolvido com validade sem lote válido e sem validade informada → recusado; produto inativo devolvido → aceito; esperado do caixa não muda pelo devolvido; cancelar estorna as entradas do devolvido; cancelar com o devolvido já vendido de novo → recusado; a mesma chave enviada de novo devolve a mesma venda.
- **Tela (Playwright):** no balcão, troca com diferença em dinheiro e troco; troca sem diferença; "Faltam R$ X" impede concluir; a marca Troca na lista e o devolvido no detalhe e no comprovante; o caixa mostra as trocas à parte e o esperado só com a diferença.
- **Manual:** `docs/manual/balcao.md` com a troca.
