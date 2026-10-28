# Estoque

Fica em **Estoque** e em **Alertas**, no menu. Todos os usuários veem saldos, lotes, validades e o extrato. Só o administrador vê custos.

Duas regras valem sempre, venha a mudança de onde vier:

- **O saldo nunca fica negativo.** Uma saída maior que o saldo é recusada, e nada muda.
- **Nada se apaga.** Toda mudança de estoque vira uma movimentação no extrato. Um erro se corrige com **estorno** (veja abaixo).

## 1. Ver o estoque

- Em **Estoque**, a lista tem uma linha por variação, com:
  - **Saldo** (tudo o que tem);
  - **Disponível** (sem os lotes vencidos);
  - **Próxima validade**;
  - **Mínimo** (o estoque mínimo da variação).
- **Buscar** procura pelo nome, pelo código interno ou pelo código de barras. **Só com saldo** esconde o que está zerado.
- Clique no produto para abrir a **página da variação**:
  - produto que controla validade mostra a tabela de **Lotes**, da validade mais próxima para a mais distante, com **Vencido** nos que já passaram;
  - produto sem controle de validade mostra só o saldo (o estoque fica num lote só, que não aparece);
  - o administrador vê também o **Custo médio**.
- Na ficha do produto, cada variação tem o link **Ver estoque**.

Quantidades: produto por unidade conta em **un**; produto por peso conta em **g**.

## 2. Entrada manual (só administrador)

Para mercadoria que chega **sem nota**: compra sem nota, brinde ou amostra de fornecedor. (A entrada por nota fiscal está em [Notas de entrada](notas-de-entrada.md).)

1. Abra a página da variação e vá até **Entrada manual**.
2. Preencha:
   - **Quantidade** e **Em**: em unidades, numa forma de venda (ex.: 3 em "Caixa com 100" = 300 un) ou, no produto por peso, em **g** ou **kg** (até 3 casas: 1,250 kg = 1.250 g);
   - **Custo (R$)**: o custo **pela unidade escolhida em "Em"** (ex.: R$ 12,00 a caixa). É obrigatório. Brinde ou amostra entra com **0,00**;
   - **Validade**, só para produto que controla validade. A data não pode ter passado;
   - **Lote (opcional)**: se ficar vazio, o sistema cria `ENT-AAAA-MM-DD` com a data de hoje (e `-2`, `-3`… se já houver um no dia). Se você digitar um lote que já existe, a quantidade soma nele, desde que a validade seja a mesma;
   - **Motivo**: aparece no extrato.
3. Clique em **Registrar entrada**. Aparece **Entrada registrada.**

O custo médio é recalculado a cada entrada: a média ponderada entre o que já havia e o que entrou.

## 3. Perda ou ajuste

Para o que se perdeu (avaria, vencimento, quebra na balança) ou para corrigir uma contagem.

1. Abra a página da variação e vá até **Perda ou ajuste**.
2. Escolha o **Lote** (só em produto que controla validade) e o **Tipo**:
   - **Perda por avaria**: caixa amassada, embalagem rasgada, produto molhado;
   - **Perda por vencimento**: só aparece quando o lote escolhido está vencido. **De um lote vencido só sai perda por vencimento**;
   - **Quebra de pesagem**: só em produto por peso (a diferença que fica na balança);
   - **Ajuste: entrou** ou **Ajuste: saiu**: para corrigir o saldo depois de contar.
3. Informe **Quantidade**, **Em** e **Motivo** e clique em **Registrar**.

**O limite da funcionária:**

- O valor de uma perda ou ajuste é quantidade × custo médio.
- Se o valor passar do **limite de ajuste** (em **Configurações**; o padrão é R$ 50,00), a funcionária vê **Acima do seu limite: virou uma solicitação para o administrador aprovar.** O estoque só muda quando o administrador aprovar.
- Se a variação ainda não tem custo médio (nunca teve entrada com custo), toda perda ou ajuste da funcionária vira solicitação.
- O administrador não tem limite.

## 4. Solicitações

Em **Estoque**, clique em **Solicitações**.

- A funcionária vê as solicitações dela e a situação de cada uma: **Pendente**, **Aprovada** ou **Recusada**.
- O administrador vê todas, com as pendentes primeiro, e clica em **Aprovar** ou **Recusar**.
- Ao aprovar, a movimentação entra no extrato em nome de quem pediu, com o nome de quem aprovou.
- Se o saldo já não basta para a solicitação, aparece a mensagem de saldo insuficiente, e ela continua pendente.

## 5. Extrato e estorno

Em **Estoque**, clique em **Movimentações**. Na página da variação, **Ver extrato** já abre só as dela.

- Filtros: **Tipo**, **De** e **Até** (datas de São Paulo). Clique em **Filtrar**.
- Cada linha mostra data e hora, produto, lote, tipo, quantidade (com sinal: **+** entrou, **-** saiu), motivo e quem fez.

**Estornar (só administrador):**

1. Na linha da movimentação errada, clique em **Estornar**.
2. Escreva o **Motivo do estorno** e clique em **Confirmar estorno**.

Aparece **Estorno registrado.**:

- uma nova linha **Estorno** desfaz a quantidade;
- a linha original fica marcada **Estornada**.

Regras do estorno:

- cada movimentação só pode ser estornada uma vez;
- um estorno não pode ser estornado;
- não dá para estornar uma entrada da qual parte já saiu, se o saldo ficaria negativo. Primeiro corrija as saídas;
- o estorno de uma entrada tira aquela entrada do custo médio.

## 6. Alertas e avisos do Início

**Alertas** mostra:

- **Vencendo**: lotes com saldo que vencem em até 30, 15 ou 7 dias (os dias ficam em **Configurações**);
- **Vencidos com saldo**: registre a **Perda por vencimento** desses lotes;
- **Abaixo do estoque mínimo**: variações ativas em que o disponível (sem os vencidos) ficou abaixo do mínimo da variação. Mínimo 0 quer dizer sem alerta.

O **Início** mostra um aviso por item com contagem (cada um leva à página certa) e as solicitações pendentes. Sem nada, aparece **Nenhum aviso.**

## 7. Conferência diária

Todo dia às 03:00 o sistema confere se o saldo de cada lote é igual à soma das movimentações dele.

Se achar diferença, o administrador vê no Início: "A conferência de dd/mm/aaaa achou N diferença(s) entre saldo e movimentações."

Isso não deveria acontecer: toda mudança passa pelas regras do banco. Se aparecer:

- não corrija o saldo por conta própria;
- peça ajuda ao Claude, informando a data do aviso, para investigar o que mudou o saldo por fora.
