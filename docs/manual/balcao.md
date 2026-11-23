# Balcão: caixa e venda

O balcão troca a calculadora: cada venda é registrada no computador, sai do estoque (o que vence primeiro sai primeiro) e fica guardada com a forma de pagamento. No fim do dia, o caixa é conferido no sistema.

O computador do balcão fica com **um login só** o dia todo. As vendas e os fechamentos ficam no nome dessa conta.

## 1. Abrir o caixa (começo do dia)

1. No menu, clique em **Caixa** (ou em **Balcão**: sem caixa aberto, ele mostra o mesmo formulário).
2. Em **Troco inicial**, digite quanto dinheiro tem na gaveta (pode ser 0,00) e clique em **Abrir caixa**.

Só existe um caixa aberto por vez.

## 2. Vender

Em **Balcão**, o cursor fica no campo **Código ou nome**.

- **Com o leitor de código de barras:** bipe o produto. Ele entra na venda com quantidade 1; bipar de novo soma 1.
  - O código da **unidade** põe a forma de menor quantidade (ex.: Unidade).
  - O código do **pacote ou da caixa** (cadastrado na ficha do produto, em **Código de barras da forma**) põe essa forma (ex.: Pacote com 100).
- **Leitor com defeito:** toque em **Câmera** (no computador, usa a webcam, se houver) e mire no código de barras: o produto entra como se tivesse sido bipado. **Fechar** (ou Esc) fecha a câmera, e o cursor volta ao campo **Código ou nome**, pronto para o leitor.
- **Sem código:** digite o código interno (ex.: FM-1) e Enter, ou parte do nome e Enter: aparece a lista, e é só clicar no produto.
- **Forma:** se o produto tem várias formas de venda, escolha na linha (Unidade, Pacote com 100…).
- **Quantidade:** mude na linha. O preço da faixa de quantidade entra sozinho (ex.: a partir de 3 pacotes).
- **Granel:** pese na balança e digite os **Gramas** na linha. O sistema calcula pelo preço do kg.
- **Tirar um item:** o **×** da linha.

### Desconto

Em **Desconto**, digite o valor e escolha **R$** ou **%**. A funcionária pode dar até o limite das Configurações (começa em 10%).

**Desconto acima do limite:** o administrador sai da conta do balcão (**Sair**), entra com a dele, dá o desconto e conclui a venda; depois a conta do balcão entra de novo. A venda em andamento **não se perde**: ela fica guardada neste computador e volta depois da troca de login.

### Receber

1. Clique em **Receber (F2)** (ou aperte F2).
2. Escolha a **Forma de pagamento** (Dinheiro, Cartão de crédito, Cartão de débito ou Pix). O cartão continua sendo passado na maquininha como hoje.
3. No dinheiro, digite o **Recebido**: o sistema mostra o **Troco**.
4. **Pagamento em duas formas** (ex.: parte no Pix e parte em dinheiro): clique em **Dividir o pagamento** e acerte os valores. A soma tem de dar o total.
5. Clique em **Concluir venda**. Aparece **Venda nº …**, o troco e **Imprimir comprovante**. A tela fica pronta para a próxima venda.

**Voltar (Esc)** fecha o pagamento sem vender. **Descartar venda** apaga a venda em andamento.

### Comprovante

**Imprimir comprovante** abre o cupom no tamanho da impressora (80 mm, ou 58 mm nas Configurações) com a frase "Não é documento fiscal". Para sair direto na impressora de cupom:

1. No Windows, deixe a impressora de cupom como **impressora padrão**.
2. Na janela de impressão do navegador, desligue **Cabeçalhos e rodapés** e use margens **Nenhuma**.

## 3. Venda sem saldo

Quando o sistema diz que não tem (ou tem menos) e o cliente está com o produto na mão, a linha avisa **Sem saldo no sistema** e a venda **passa normalmente**. O sistema dá entrada da quantidade que faltava (motivo "Venda sem saldo nº …") e põe o produto na lista do administrador.

- Produto com validade sem nenhum lote válido no sistema: a linha pede a **Validade da embalagem**.
- Produto cujo estoque no sistema está **vencido**: a linha avisa e pede para marcar **Conferi** depois de olhar a validade na embalagem.

**O que o administrador faz:** em **Vendas** → **Vendas sem saldo** (ou pelo aviso no Início), confere a prateleira de cada produto, faz um ajuste ou um inventário se precisar, e clica em **Marcar como conferido**.

## 4. Retirada e reforço de dinheiro

Durante o dia, em **Caixa**: escolha **Retirada** (dinheiro que sai da gaveta, ex.: pagar o entregador, levar ao cofre) ou **Reforço** (mais troco), digite o **Valor** e o **Motivo** e clique em **Registrar**.

## 5. Fechar o caixa (fim do dia)

1. Em **Caixa**, conte o dinheiro da gaveta e digite em **Dinheiro contado**.
2. Se quiser, digite os totais de **Crédito**, **Débito** e **Pix** do extrato da maquininha e do banco.
3. Clique em **Fechar caixa** e confirme. O caixa fechado não reabre.

O fechamento é **às cegas**: o sistema só mostra quanto esperava **depois** de fechar, para a contagem ser da gaveta, e não do número da tela. O resumo mostra, para cada forma, o esperado, o contado e a **diferença**.

**Diferença:** o administrador vê o aviso no Início, abre o caixa em **Caixa** → **Caixas fechados**, confere o motivo (troco errado, venda não registrada…) e clica em **Marcar como conferido**.

## 6. Cancelar uma venda (administrador)

Em **Vendas**, abra a venda, digite o **Motivo do cancelamento** e clique em **Cancelar venda** (confirme). O estoque volta (por estorno, nada se apaga) e a venda sai do esperado do caixa, se ele ainda estiver aberto. Se o caixa já fechou, o fechamento guardado não muda.

## 7. Se a internet cair

O balcão não vende sem internet. Volte à calculadora, anote as vendas (produto, quantidade, pagamento) e lance no sistema quando a internet voltar.
