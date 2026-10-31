# Inventário

Fica em **Inventário**, no menu. Serve para contar o estoque de verdade e acertar o saldo do sistema pelo que foi contado.

- **Todos** contam.
- **Só o administrador** abre, encerra a contagem, revisa, aprova ou cancela.
- **Só um inventário fica em andamento por vez** (em contagem ou em revisão). Para abrir outro, termine ou cancele o atual.

O caminho de um inventário:

1. O administrador **abre** com um escopo.
2. A equipe **conta** pelo celular.
3. O administrador **encerra a contagem** e **revisa** as diferenças.
4. O administrador **aprova** (o estoque recebe os ajustes) ou **cancela** (nada muda).

## 1. Abrir (administrador)

Em **Inventário**, na caixa **Abrir inventário**:

1. **Descrição**: por exemplo "Prateleira das forminhas". Vazia, vira "Inventário de dd/mm/aaaa".
2. **Escopo**: o que vai ser contado:
   - **Loja inteira**: todas as variações;
   - **Categorias**: marque as categorias. As subcategorias entram junto;
   - **Variações**: cole os códigos internos, um por linha. Um código que não existe aparece em **Código interno não encontrado: …**.
3. Clique em **Abrir inventário**. A página da contagem abre.

## 2. Contar (todos, pelo celular)

Na página do inventário (situação **Em contagem**):

1. Em **Buscar**, digite o nome, o código interno ou o código de barras e clique em **Buscar**. Sem busca, aparecem os primeiros itens do escopo.
2. Cada produto achado mostra o que contar:
   - **produto sem controle de validade**: um formulário só (**Contagem de {produto} – {variação}**);
   - **produto com validade**: um formulário por lote (**Lote {código}, vence em {dd/mm/aaaa}**).
3. Digite a contagem em qualquer combinação de campos. O sistema soma tudo:
   - por unidade: **unidade(s)** e cada forma de venda (ex.: 3 em **Caixa com 100** e 4 em **Pacote com 10** = 340 un);
   - por peso: **g** e **kg** (até 3 casas: 1,250 kg = 1.250 g).
4. Clique em **Salvar contagem**. Aparece **Contagem salva.** e, no formulário, **Contado: 340 un**.

Detalhes:

- **Contar de novo** o mesmo item substitui a contagem anterior.
- **Para zerar** um item (não tem nenhum), conte **0**. **Item que ninguém contou não muda.**
- **Lote que não está na lista** (achou na prateleira um lote que o sistema não conhece): preencha a **Validade** (obrigatória), o **Código do lote** (opcional; vazio vira `INV-AAAA-MM-DD`) e a contagem. O lote é criado na hora.

### Por que não aparece o saldo do sistema?

A contagem é **às cegas**: quem conta não vê quanto o sistema acha que tem. Assim a pessoa conta o que está na prateleira, em vez de "confirmar" o número do sistema. As diferenças aparecem só para o administrador, na revisão.

(O saldo continua aparecendo na tela **Estoque**. Durante o inventário, conte pela prateleira, não pela tela.)

## 3. Revisar (administrador)

Quando a contagem terminar, clique em **Encerrar contagem** e confirme. Aparece **Contagem encerrada: confira as diferenças.**

A página mostra:

- **o resumo**: quantos itens foram contados, quantos com diferença, quantas variações do escopo foram contadas e a **primeira e a última contagem** (o tempo gasto);
- **a tabela Diferenças**, uma linha por item contado: **No sistema na contagem**, **Contado**, **Diferença** (com sinal: **-10 un** faltou, **+10 un** sobrou) e **Valor** (diferença × custo médio; "sem custo" se a variação nunca teve entrada com custo).

Se algo parecer errado (alguém contou no lugar errado), clique em **Voltar a contar**: a contagem reabre, e o que já foi contado continua lá.

## 4. Aprovar ou cancelar (administrador)

- **Aprovar inventário** (confirme): cada item com diferença vira um **Ajuste de inventário** no estoque, com o motivo **Inventário nº {número}**. Aparece **Inventário aprovado: {n} ajuste(s) no estoque.** e o link **Ver ajustes no extrato**.
- **Cancelar inventário** (confirme, em contagem ou em revisão): nada muda no estoque. Aparece **Inventário cancelado.**

### O que se moveu depois da contagem

O ajuste é **contado − saldo no momento da contagem**. Por isso, uma venda ou perda feita depois de alguém contar um item **não se perde** na aprovação.

Exemplo: o sistema tinha 100, alguém contou 90 e depois houve uma perda de 5 (o saldo foi para 95). A aprovação ajusta −10, e o saldo fica 85.

Se o estoque baixou tanto depois da contagem que o ajuste deixaria um saldo negativo, **nada é ajustado** e aparece, por exemplo, **Forminha – Padrão (lote GERAL): o ajuste de -8 un deixaria o saldo negativo (há 5 un agora). Nada foi ajustado.** Clique em **Voltar a contar**, conte aquele item de novo e aprove.

## 5. Ensaio de uma prateleira (fase 1)

Antes da contagem oficial da loja inteira (início da fase 2), faça um ensaio:

1. Abra um inventário com o escopo **Variações** (os códigos de uma prateleira) ou com a **Categoria** daquela prateleira.
2. Conte tudo pelo celular, como na seção 2.
3. Encerre, revise e aprove.
4. Confira em **Estoque**: o saldo de cada item contado é igual ao que foi contado.
5. Anote o tempo gasto pela **primeira e última contagem**, que aparecem no resumo. Ele serve para planejar a contagem da loja inteira.
