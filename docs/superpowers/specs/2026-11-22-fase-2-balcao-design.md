# Fase 2: Balcão (caixa, venda e o começo do uso)

- **Data:** 2026-11-22
- **Situação:** aprovada em 2026-11-22
- **Visão geral do projeto:** [README](../../../README.md) · **Base:** [fase 1](2026-10-21-fase-1-base-design.md)

## 1. Objetivo

Trocar a calculadora do balcão pelo sistema: cada venda passa a ser registrada, sai do mesmo estoque da fase 1 e fica guardada com a forma de pagamento, e o caixa é aberto e fechado no sistema. Assim o estoque passa a bater com a prateleira — a condição para a loja online da fase 3 ("se o site mostra que tem, a prateleira tem").

## 2. Como é hoje (conversa com o usuário, 2026-11-22)

- O cliente chega ao balcão com os produtos; alguém da loja **soma na calculadora**; o cliente paga em **dinheiro, cartão ou Pix**; pronto. Não sai nota (a NFC-e só quando o cliente pede, fora do sistema).
- **No fim do dia a loja confere o caixa** (dinheiro da gaveta e pagamentos).
- No balcão, o sistema vai rodar **num computador**.
- Os produtos vêm dos fornecedores **com o código de barras deles** (a NF-e real de compra que a loja tem traz o código GTIN de 13 dígitos no item).

## 3. Decisões do usuário

| Decisão | Quando |
|---|---|
| Balcão no **computador** | 2026-11-22 |
| **Caixa de verdade**: abrir com o troco, fechar conferindo dinheiro, cartão e Pix | 2026-11-22 |
| **Venda sem saldo não trava**: a venda passa, o sistema dá entrada da falta com motivo "venda sem saldo" e põe o produto numa lista para o administrador conferir | 2026-11-22 |
| Fase 2 em partes, começando pela **2.1 Caixa e venda** | 2026-11-22 |
| **Um login só** no computador do balcão, o dia todo; **não precisa saber qual pessoa fez cada venda** | 2026-11-22 |
| A loja tem **impressora de cupom** (térmica) no balcão | 2026-11-22 |
| Os detalhes da seção 6 marcados "(proposta aceita)" foram propostos pelo Claude e aceitos pelo usuário ("certo") | 2026-11-22 |

## 4. Partes da fase 2

| Parte | Entrega |
|---|---|
| **2.1 Caixa e venda** | caixa (abrir, retirar/reforçar dinheiro, fechar com conferência); tela de venda no computador (leitor de código de barras e busca); preço do catálogo; desconto; pagamento em dinheiro (com troco), cartão de crédito, cartão de débito e Pix, podendo dividir; saída pelo vencimento (FEFO); venda sem saldo com aviso; cancelar venda; comprovante não fiscal; avisos no Início |
| **2.2 Câmera do celular** | leitura de código de barras pela câmera do celular, na contagem do inventário e como reserva do leitor no balcão |
| **2.3 Contagem oficial e começo do uso** | contagem da loja inteira com o inventário da fase 1 e o roteiro do primeiro dia de balcão (precisa do banco de produção) |
| **2.4 Troca e devolução** | definida depois da 2.1 |

Cada parte tem o seu plano. Esta especificação detalha a 2.1; as 2.2 a 2.4 ficam no nível de objetivo e são detalhadas antes do plano delas.

## 5. Fora da fase 2

| Fica para depois | Onde |
|---|---|
| Nota fiscal (NFC-e) | fase 4, ou antes se o contador recomendar |
| Ligação com a maquininha (TEF) — o valor do cartão é digitado na maquininha como hoje | não previsto |
| Cadastro de clientes, fiado, venda a prazo | fase 3/4 |
| Vender sem internet | não previsto (ver riscos, seção 11) |
| Mais de um caixa ao mesmo tempo | não previsto |
| Ligação com balança | não previsto (a pessoa digita os gramas) |

## 6. Regras do balcão (2.1)

### 6.1 Caixa

- **C1. Um caixa aberto por vez.** Abrir pede o **troco inicial** em dinheiro (pode ser R$ 0,00). Sem caixa aberto, a tela de venda mostra só o botão de abrir.
- **C2. Quem pode:** funcionária e administrador abrem, vendem, fazem retirada/reforço e fecham. No dia a dia o computador do balcão fica com **uma conta só** (de papel funcionária, decisão do usuário), e cada venda e fechamento fica registrado no nome da conta que estava logada; não há registro de qual pessoa atendeu.
- **C3. Retirada e reforço de dinheiro:** durante o dia, registrar dinheiro que sai da gaveta (ex.: pagar um entregador, levar ao cofre) ou que entra (mais troco), com valor e motivo.
- **C4. Fechamento:** o sistema mostra o **esperado** por forma de pagamento:
  - dinheiro = troco inicial + dinheiro das vendas (já descontado o troco devolvido) + reforços − retiradas;
  - cartão de crédito, cartão de débito e Pix = soma das vendas não canceladas do caixa.

  O fechamento é **às cegas** para quem fecha (como a contagem do inventário): a pessoa informa primeiro o **dinheiro contado** na gaveta (obrigatório) e, se quiser, os totais de crédito, débito e Pix do extrato da maquininha/banco; só depois de gravar o sistema mostra o esperado e a **diferença** de cada um. O caixa fechado não reabre. Crédito, débito e Pix só têm diferença quando o valor foi informado. (escolha do Claude, depois da checagem do construtor)
- **C5. Quem vê o quê:** o administrador vê todos os caixas, com esperado e diferenças, e marca cada caixa fechado com diferença como **conferido** (o aviso do Início some). A funcionária vê o caixa aberto (vendas, retiradas e reforços, sem o esperado) e, dos caixas fechados, só os que **ela fechou**, já com o esperado e a diferença. Qualquer diferença diferente de zero conta. (escolha do Claude)

### 6.2 Venda

- **V1. Uma venda é tudo ou nada:** uma única função do banco grava a venda, os itens, os pagamentos, as saídas do estoque e as entradas de venda sem saldo; se algo falhar, nada fica gravado. Trava as linhas de saldo na mesma ordem da R10.
- **V2. Itens:** cada item é uma **variação + forma de venda + quantidade**:
  - por unidade: quantidade em número de formas (ex.: 3 "Pacote com 100" = 300 unidades base);
  - por peso: a forma "Granel", com a quantidade em **gramas** (a pessoa pesa na balança e digita). (proposta aceita)
- **V3. Preço:** o do catálogo no momento da venda, com as **faixas de quantidade** (`precoUnitario`/`precoTotal`) e o **preço por peso** (`precoPorPeso`) já escritos na fase 1 em `src/lib/catalogo/preco.ts`; o banco calcula de novo e recusa se o total enviado pela tela não bater (o preço não vem da tela). Forma ou variação inativa não vende.
- **V4. Desconto** na venda inteira, em R$ ou em %, arredondado ao centavo. A funcionária dá até `configuracoes.limite_desconto_percentual` (padrão **10%**, novo campo); acima disso, só o administrador. O total nunca fica negativo. (proposta aceita)
  - **Como o administrador libera:** com um login só no balcão, o administrador sai da conta do balcão e entra com a dele (com as duas etapas) no mesmo computador, dá o desconto e conclui a venda; depois a conta do balcão entra de novo. Para ninguém bipar tudo de novo, a **venda em andamento fica guardada no navegador** daquele computador e volta sozinha depois da troca de login (enquanto não for concluída ou descartada). (escolha do Claude, depois da decisão do usuário sobre o login)
- **V5. Pagamento:** uma ou mais partes (ex.: R$ 20 em Pix e o resto em dinheiro), com as formas **dinheiro**, **cartão de crédito**, **cartão de débito** e **Pix**. A soma das partes é igual ao total. No dinheiro, a pessoa informa o valor recebido e o sistema mostra e guarda o **troco**; só o dinheiro pode ter troco.
- **V6. Saída do estoque pelo vencimento:** cada item sai com `retirar_fefo` (R3/R4 da fase 1), em movimentações do tipo novo **`venda`**, com origem na venda.
- **V7. Venda sem saldo** (decisão do usuário): se o saldo disponível (lotes não vencidos) não cobre a quantidade, a venda **não para**:
  - o sistema dá **entrada da quantidade que falta**, em movimentação do tipo novo **`entrada_venda_sem_saldo`**, com o motivo "Venda sem saldo nº {número}", e então faz a saída;
  - **lote da entrada:** produto sem controle de validade → o lote `GERAL`; com validade → o lote **não vencido de validade mais distante** dessa variação, mesmo com saldo zero; se não houver nenhum, a tela pede a **validade impressa na embalagem** e cria o lote `VSS-AAAA-MM-DD` (mesma regra de repetição da R7);
  - o item entra na lista **Vendas sem saldo** do administrador, que marca cada um como **conferido** depois de olhar a prateleira (e, se for o caso, fazer um ajuste ou inventário pelo que já existe);
  - o custo dessa entrada é o custo médio da variação; sem custo médio, fica sem custo (não muda o custo médio, como as perdas e ajustes).
- **V8. Só lote vencido:** se a única quantidade no sistema está em lote vencido, a tela avisa "O estoque deste produto no sistema está vencido. Confira a validade na embalagem." e pede confirmação antes de seguir pela V7. (proposta do Claude; ver seção 12)
- **V9. Custo da venda:** cada saída grava o custo médio do momento em `movimentacoes_custos` (só administrador lê), para a margem da fase 4.
- **V10. Número da venda:** sequencial, único, mostrado na tela e no comprovante.
- **V11. Cancelar venda:** só o administrador, com motivo, enquanto o caixa da venda estiver aberto ou depois (proposta aceita). O cancelamento estorna as movimentações da venda (R2: estorno, nunca apagar), inclusive as entradas de venda sem saldo; as partes do pagamento saem do esperado do caixa se ele ainda estiver aberto; se o caixa já fechou, o cancelamento aparece no histórico do caixa como "cancelada depois do fechamento" e não muda o fechamento já guardado. Venda cancelada não se cancela de novo.
- **V12. Comprovante:** botão **Imprimir comprovante**, pela impressão do navegador, no formato da **impressora de cupom** térmica do balcão (decisão do usuário): largura de 80 mm, com a opção de 58 mm em Configurações (campo novo `largura_cupom_mm`, 80 ou 58), letra legível e sem cores. Traz o nome da loja ("Di Boni" e o CNPJ das configurações), o número da venda, data e hora, os itens, desconto, total, pagamentos e troco, e a frase "Não é documento fiscal". A impressora é usada como impressora comum do Windows (o manual explica como deixá-la como padrão e tirar as margens do navegador).

### 6.3 Tela de venda (computador)

- Um campo **Código ou nome** sempre com o cursor: o leitor de código de barras USB funciona como teclado e termina com Enter.
  - **Código de barras exato** de uma **forma de venda** ativa (campo novo, opcional: o código do pacote ou da caixa, ex.: "Pacote com 100") → entra essa forma, quantidade 1 (ou soma 1).
  - **Código de barras exato** de uma variação ativa (o da unidade) → entra a forma de menor fator, quantidade 1 (ou soma 1). (escolha do Claude: cobre o código da unidade e o da embalagem)
  - **Código interno exato** → idem.
  - **Outro texto** → lista de busca por nome (até 20), escolhida com as setas e Enter ou com o mouse.
- Variação com **uma** forma de venda ativa entra nela; com **várias**, a linha mostra a escolha da forma (começa na de menor fator). Granel abre o campo de **gramas**.
- Cada linha: produto e variação, forma, quantidade (editável), preço unitário (mostrando a faixa aplicada), total da linha, remover.
- Rodapé: subtotal, desconto, **total** em destaque, e o botão **Receber** (abre o pagamento: partes, valor recebido em dinheiro, troco). Concluir grava a venda (V1) e mostra a confirmação com o número, o troco e **Imprimir comprovante**; a tela volta vazia para a próxima.
- Atalhos de teclado para o mais usado (ex.: F2 Receber, Esc cancelar a edição); a lista fica no plano.
- Os avisos de venda sem saldo (V7) e de lote vencido (V8) aparecem na linha do item antes de receber.
- Segue o DESIGN.md (vidro, botões de jogo), com o total legível de longe e sem animação que atrase quem vende.

### 6.4 Telas novas e avisos

| Tela | Quem | O que tem |
|---|---|---|
| **Balcão** (`/balcao`) | todos | a venda (6.3); abrir caixa quando não há um aberto |
| **Caixa** (`/caixa`) | todos | o caixa aberto: vendas do dia, retiradas/reforços, **Fechar caixa**; histórico dos fechados (a funcionária vê os dela; o administrador, todos) |
| **Vendas** (`/vendas`, `/vendas/[numero]`) | todos veem; só o administrador cancela | lista por dia e caixa; detalhe com itens, pagamentos, saídas por lote; custo só para o administrador |
| **Vendas sem saldo** (`/vendas/sem-saldo`) | administrador | os itens da V7 ainda não conferidos, com produto, quantidade, venda e quem vendeu; **Marcar como conferido** |
| **Configurações** | administrador | novo campo: limite de desconto da funcionária (%) |

No **Início**: aviso de **vendas sem saldo a conferir** e de **caixa fechado com diferença** (administrador); de **caixa aberto há mais de um dia** (todos).

## 7. Modelo de dados (2.1)

Convenções da fase 1 (seção 5 da especificação dela): dinheiro em centavos, quantidades inteiras na unidade base, custo `numeric(14,6)`, fuso de São Paulo, RLS em tudo, gravação só por funções do banco, nada se apaga.

- **caixas:** id, situacao (`aberto` | `fechado`), aberto_por, aberto_em, troco_inicial_centavos, fechado_por, fechado_em, e, no fechamento, para cada forma (dinheiro, crédito, débito, Pix): esperado_centavos e informado_centavos (informado só obrigatório no dinheiro). Índice único que garante um só `aberto`.
- **caixa_movimentos:** id, caixa_id, tipo (`retirada` | `reforco`), valor_centavos (> 0), motivo, usuario_id, em.
- **vendas:** id, numero (sequencial, único), caixa_id, vendida_por, vendida_em, subtotal_centavos, desconto_centavos, total_centavos, situacao (`concluida` | `cancelada`), cancelada_por, cancelada_em, motivo_cancelamento.
- **venda_itens:** id, venda_id, variacao_id, forma_venda_id, quantidade (formas ou gramas), quantidade_base, preco_unitario_centavos (por forma, ou por kg no granel), total_centavos, quantidade_sem_saldo_base (0 quando teve saldo), conferido_por, conferido_em (para a lista de vendas sem saldo).
- **venda_pagamentos:** id, venda_id, forma (`dinheiro` | `cartao_credito` | `cartao_debito` | `pix`), valor_centavos (> 0), recebido_centavos e troco_centavos (só dinheiro).
- **movimentacoes.tipo:** novos `venda` e `entrada_venda_sem_saldo`; origem `venda` e origem_id = id da venda.
- **configuracoes:** novos `limite_desconto_percentual` (padrão 10, de 0 a 100) e `largura_cupom_mm` (80 ou 58, padrão 80).
- **formas_venda:** novo `codigo_barras` opcional (GTIN válido, único entre formas e variações), editável na ficha do produto e na planilha do catálogo (coluna nova na aba Formas de venda).
- **caixas:** também `conferido_por` e `conferido_em` (administrador, para caixas com diferença).

## 8. Usuários e permissões (2.1)

| Ação | Administrador | Funcionária |
|---|---|---|
| Abrir, reforçar, retirar e fechar caixa | ✓ | ✓ |
| Vender | ✓ | ✓ |
| Desconto até o limite | ✓ | ✓ |
| Desconto acima do limite | ✓ | ✗ |
| Ver vendas | todas | todas, sem custo |
| Ver caixas | todos, com esperado e diferença | o aberto (sem esperado) e os fechados por essa conta (com um login só, todos os do balcão) |
| Marcar caixa com diferença como conferido | ✓ | ✗ |
| Cancelar venda | ✓ | ✗ |
| Ver e conferir vendas sem saldo | ✓ | ✗ |
| Ver custo da venda e margem | ✓ | ✗ |
| Mudar o limite de desconto | ✓ | ✗ |

O administrador continua precisando das duas etapas (aal2) para as ações de administrador.

## 9. Testes e verificação (2.1)

**Banco (pgTAP):** um teste para cada regra C1–C4 e V1–V11, incluindo:
- abrir um segundo caixa com um aberto é recusado;
- venda de 3 "Pacote com 100" com faixa a partir de 3 → preço da faixa; total enviado diferente do calculado → recusada e nada gravado;
- granel 350 g a R$ 40,00/kg → R$ 14,00; saída de 200 g do lote que vence antes e 150 g do seguinte;
- saldo 2 e venda de 5 → entrada de 3 `entrada_venda_sem_saldo` e saída de 5; o saldo termina em 0, nunca negativo; o item aparece na lista;
- produto com validade sem lote válido → sem a validade informada a venda é recusada; com ela, cria `VSS-…`;
- desconto da funcionária acima do limite → recusado; do administrador → aceito;
- pagamento com soma diferente do total → recusado; troco só no dinheiro;
- fechamento: esperado de dinheiro com troco inicial, vendas, troco devolvido, reforço e retirada; diferença guardada;
- cancelar → estornos de todas as movimentações da venda; cancelar de novo → recusado; funcionária cancelando → recusado;
- a funcionária não lê custo da venda.

**Concorrência:** duas vendas ao mesmo tempo da última unidade → as duas concluem, uma delas como venda sem saldo, e o saldo final é 0 (nunca negativo, nenhuma trava eterna).

**Código (Vitest):** o cálculo do carrinho na tela (linhas, faixas, peso, desconto, partes, troco) com os mesmos números dos testes de banco.

**Telas (Playwright):** abrir caixa; vender bipando (digitar o código e Enter) e buscando pelo nome; venda com troco; venda dividida Pix + dinheiro; desconto acima do limite como funcionária; venda sem saldo e a lista do administrador; cancelar como administrador; fechar caixa com diferença; a funcionária não vê custo.

**Fora do código:** um ensaio de um dia de balcão no banco de teste (dados inventados), anotando o tempo de cada venda.

## 10. Manual (`docs/manual/`)

Novo `balcao.md`: abrir o caixa; vender (leitor, busca, formas, granel, desconto, pagamento, troco, comprovante); venda sem saldo e o que o administrador faz com a lista; retirada e reforço; fechar o caixa e o que fazer com a diferença; cancelar uma venda.

## 11. Riscos

- **Internet caiu:** o balcão não vende sem internet. Até haver outra solução, a loja volta à calculadora e lança as vendas depois (o manual explica).
- **Sessão do dia todo:** a conta do balcão fica logada o dia inteiro; a sessão se renova sozinha (proxy da fase 1). Se a internet cair por muito tempo e a sessão vencer, a pessoa entra de novo, e a venda guardada no navegador volta.
- **Velocidade:** cada bipada não pode esperar o banco nos EUA; a busca por código exato deve responder rápido (o banco de produção em São Paulo ajuda; a etapa 2 da fluidez já reduziu as esperas).
- **Banco de teste:** a 2.1 pode ser construída e testada agora, mas o uso de verdade só depois do banco de produção (critério da 2.3).

## 12. Escolhas do Claude para o usuário conferir

- **V8:** quando o único estoque no sistema está vencido, a tela avisa e pede confirmação antes de vender.
- **Limite de desconto** da funcionária começa em **10%** (muda em Configurações).
- **C4/C5:** fechamento às cegas; a funcionária vê o esperado só depois de informar o contado.
- **Código de barras também na forma de venda** (pacote ou caixa), além do da unidade.
- **Venda em andamento guardada no navegador** durante a troca de login para o desconto.
- **Cartão separado em crédito e débito**, para bater com o extrato da maquininha.
- **Retirada e reforço** de dinheiro no caixa.

## 13. Deixado para quem constrói

- A forma exata da função de venda (uma função com o carrinho em JSON, no padrão das funções da fase 1).
- Os atalhos de teclado.
- A lista exata de colunas de exibição nas telas novas, seguindo as telas da fase 1.
