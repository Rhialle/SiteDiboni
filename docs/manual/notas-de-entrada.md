# Notas de entrada

Fica em **Notas**, no menu. É por aqui que a mercadoria comprada com nota fiscal entra no estoque: você importa o XML da nota, confere e confirma.

Todos os usuários importam, conferem e confirmam notas. Só o administrador liga itens novos a produtos e vê os valores (custo total e custo por unidade).

**Antes da primeira nota:** o **CNPJ da loja** precisa estar em **Configurações**. Sem ele, a importação mostra **Informe o CNPJ da loja em Configurações antes de importar notas.**

O caminho de uma nota:

1. **Importar** o XML. A nota aparece como **Aguardando administrador** (há item que o sistema ainda não conhece) ou **Em revisão** (todos os itens já estão ligados).
2. **Ligar** os itens novos (só o administrador).
3. **Conferir** o que chegou: recebido e lotes.
4. **Confirmar nota** (entra no estoque) ou **Descartar nota**.

## 1. Importar

1. Em **Notas**, na caixa **Importar XML**, clique em **Arquivos XML** e escolha os arquivos. Pode escolher **até 50 de uma vez**, com até 4 MB cada.
2. Clique em **Importar notas**.

Cada arquivo ganha uma linha com o resultado. Um arquivo com problema não atrapalha os outros:

| O que aparece | Por quê |
|---|---|
| **Nota 123 de Fornecedor: importada, pronta para revisar.** | Todos os itens já estavam ligados (o fornecedor já mandou esses itens antes). |
| **Nota 123 de Fornecedor: importada, aguardando o administrador ligar 2 item(ns).** | Há itens novos; o administrador precisa ligá-los. |
| **Arquivo inválido: não é o XML de uma NF-e.** | O arquivo não é um XML de nota (por exemplo, um PDF ou outro XML). |
| **Só aceitamos NF-e modelo 55 (nota de compra).** | É uma NFC-e (cupom), não uma nota de compra. |
| **Nota sem autorização da SEFAZ.** | O XML não tem o protocolo de autorização (nota cancelada, recusada ou só o rascunho). Peça ao fornecedor o XML autorizado. |
| **Esta nota não é para a loja: o destinatário é outro CNPJ.** | A nota foi emitida para outro CNPJ (outra loja, ou CPF). |
| **Esta nota já foi importada em 20/10/2026 por Maria.** | A mesma nota (mesma chave de acesso) já está no sistema. |
| **O arquivo precisa ter até 4 MB.** | Arquivo grande demais. Nota de verdade tem poucos KB: confira se é o arquivo certo. |
| **Escolha até 50 arquivos por vez.** | Escolha menos arquivos e importe em partes. |
| **Escolha pelo menos um arquivo XML.** | Você clicou em **Importar notas** sem escolher arquivo. |

Ao lado de cada nota importada há o link **Abrir a nota**.

A lista embaixo mostra as notas mais recentes primeiro, com **Número**, **Fornecedor**, **Emitida em**, **Itens**, **Situação** e **Importada por**. Para ver só uma situação, escolha em **Situação** e clique em **Filtrar**.

## 2. A página da nota

Clique no número da nota para abrir. Em cima ficam o fornecedor (com o CNPJ), a série, a data de emissão, quem importou e a **situação**.

A tabela **Itens da nota** mostra, para cada item: o número, o código do fornecedor, a descrição, a quantidade **como está na nota** (ex.: 2,5 CX), a **ligação** e o **recebido**. O administrador vê também o **Custo total** e o **Custo por unidade base**.

A funcionária vê **Aguardando o administrador ligar este item** nos itens novos e nenhum valor.

## 3. Ligar itens novos (só administrador)

Cada fornecedor tem os próprios códigos e unidades (CX, FD, DP, KG…). **Ligar** um item é dizer ao sistema qual variação é aquele item e quanto vem em cada unidade da nota. **O sistema lembra:** na próxima nota do mesmo fornecedor, o mesmo item (mesmo código e mesma unidade) já vem ligado.

Embaixo da tabela, cada item novo tem uma caixa **Item N: descrição** com duas formas de ligar.

**Ligar a uma variação** (o produto já existe):

1. Em **Código interno ou de barras**, digite o código interno da variação ou o código de barras. Se o XML trouxe um código de barras que já está numa variação, o campo já vem preenchido e aparece a **sugestão** com o nome do produto.
2. Em **Fator**, informe quantas unidades vêm em 1 unidade da nota (veja abaixo).
3. Clique em **Ligar**.

**Criar produto a partir do item** (o produto ainda não existe):

1. Os campos já vêm com o que estava no XML: **Nome** (a descrição do fornecedor; ajuste para o nome que a loja usa), **NCM** e **Código de barras**.
2. Escolha o **Tipo de venda** (**Por unidade** ou **Por peso (a granel)**) e marque **Controla validade (lote)** se for o caso (já vem marcado quando o XML traz lotes).
3. Informe o **Fator** e clique em **Criar produto e ligar**.

O produto nasce **incompleto** (sem categoria, sem forma de venda e sem preço). Ele já funciona no estoque; complete o cadastro em **Produtos** quando puder. O nome do produto, na tabela da nota, é um link para a ficha dele.

**Trocar a ligação:** enquanto a nota não foi confirmada, um item já ligado tem **Trocar a ligação** embaixo do nome do produto. Use quando o sistema ligou sozinho com o fator errado (por exemplo, a caixa do fornecedor passou de 12 para 24 unidades). A troca vale também para as próximas notas. Ao trocar, o **Recebido** e os lotes daquele item voltam a ser os da nota: confira de novo.

Quando todos os itens estão ligados, a nota passa para **Em revisão**.

### O fator

O fator é **quantas unidades da loja vêm em 1 unidade da nota**:

- produto por unidade: em **un**. Ex.: o fornecedor vende em **CX** com 100 forminhas → fator **100** (aparece **1 CX = 100 un**);
- produto por peso: em **g**. Ex.: o fornecedor vende em **KG** → fator **1000** (aparece **1 KG = 1.000 g**);
- se a nota já vem na mesma unidade da loja (UN), o fator é **1**.

A quantidade da nota vezes o fator precisa dar um número inteiro. Se não der, aparece, por exemplo, **Item 1 (FORMINHA N4 CX C/1000): 2,5 CX × 3 não dá quantidade inteira. Confira o fator.** e nada muda.

## 4. Conferir o que chegou

Com a mercadoria na mão, confira cada item na caixa **Recebimento**:

- **Recebido** já vem com a quantidade da nota, **na unidade da nota** (até 4 casas, ex.: 2,5). Se veio menos (ou mais), mude o número. Se o item não veio, ponha **0**;
- **Lotes** aparecem só no produto que controla validade. Eles vêm do XML quando o fornecedor informou. Para cada lote: **código** (opcional), **validade** e **quantidade** (na unidade da nota). Use **Acrescentar lote** e **Tirar o lote N** para acertar;
- clique em **Salvar recebimento**. Aparece **Recebimento salvo.**

A soma dos lotes precisa ser igual ao recebido, e todo lote precisa de validade. Se não for, aparece, por exemplo, **Item 2 (GRANULADO): a soma dos lotes (1900) precisa ser igual à quantidade recebida (2000).** (os números estão em un ou g).

## 5. Confirmar ou descartar

- **Confirmar nota** (só aparece com a nota **Em revisão**): o navegador pede para confirmar. Aparece **Nota confirmada: o estoque foi atualizado.**
  - cada item entra no estoque com o **recebido**, como **Entrada por nota**, com o motivo "Nota nº 123 de Fornecedor";
  - o custo de cada unidade é o custo do item na nota (produto − desconto + frete + seguro + outras despesas + IPI + ICMS-ST) dividido pela quantidade **da nota**;
  - cada item passa a ter o link **Ver estoque**;
  - se algo não estiver certo (item sem ligação, lotes que não somam), aparece a mensagem e **nada** entra no estoque.
- **Descartar nota**: o navegador pede para confirmar. Aparece **Nota descartada.** Nada entra no estoque, e a mesma nota pode ser importada de novo depois. Use quando a nota foi importada por engano ou o fornecedor vai mandar outra.

Uma nota **Confirmada** ou **Descartada** não muda mais (**Esta nota já foi confirmada ou descartada.**).

## 6. Corrigir uma nota já confirmada

A nota confirmada não muda, mas o estoque se corrige pelo **extrato** (veja o manual do [Estoque](estoque.md), "Extrato e estorno"):

1. Em **Estoque**, clique em **Movimentações**, escolha o **Tipo** **Entrada por nota** e clique em **Filtrar**.
2. As linhas da nota têm o motivo "Nota nº 123 de Fornecedor". Na linha errada, clique em **Estornar** (só administrador).
3. Depois, dê a entrada certa (manual, ou descarte e importe de novo se for a nota inteira — só dá para importar de novo uma nota descartada, não uma confirmada).

Para uma diferença pequena (veio uma unidade a menos e você só percebeu depois), use **Perda ou ajuste** na página da variação.

## 7. Divergências com o fornecedor

Em **Notas**, clique em **Divergências**. A lista mostra os itens de notas confirmadas em que o **recebido** foi diferente da **nota**, os mais recentes primeiro: **Fornecedor**, **Nota**, **Confirmada em**, **Item**, **Na nota**, **Recebido** e **Diferença** (**-2 un** veio a menos; **+2 un** veio a mais).

Use para cobrar o fornecedor e para ver quem erra com frequência.

## 8. Outros lugares onde as notas aparecem

- **Início:** o aviso **N nota(s) aguardando o administrador** leva para a lista de notas já filtrada.
- **Produtos:** **Buscar** acha também pelo nome do fornecedor (de quem a loja já recebeu aquele produto em nota).
