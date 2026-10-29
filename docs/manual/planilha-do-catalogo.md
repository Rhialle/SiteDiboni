# Planilha do catálogo

Fica em **Produtos**, no botão **Planilha** (só o administrador vê). Serve para cadastrar ou atualizar muitos produtos de uma vez, numa planilha `.xlsx` do Excel ou do Google Planilhas.

**A planilha nunca mexe no estoque nem no custo.** Ela também não muda fotos, descrição, CEST, origem fiscal nem produto inativo: isso continua na ficha do produto.

## 1. Baixar o modelo ou o catálogo

Na caixa **Baixar**:

- **Baixar modelo**: a planilha vazia, só com os cabeçalhos. Use para começar do zero;
- **Exportar catálogo**: a planilha com tudo o que já está cadastrado. Use para corrigir ou completar o que já existe e importar de volta.

Não mude os nomes das abas nem das colunas. A ordem das colunas pode mudar, e colunas a mais são ignoradas.

## 2. Aba Variações: uma linha por variação

| Coluna | O que vai | Exemplo |
|---|---|---|
| **Produto** | Nome do produto (obrigatório). Linhas com o mesmo nome são variações do mesmo produto. | Caixa para bolo |
| **Variação** | Nome da variação. Vazio vira "Padrão". | 15 x 15 cm |
| **Código interno** | Obrigatório. É ele que liga a linha ao cadastro: se já existe, a linha atualiza; se não existe, cria. | CX-15 |
| **Código de barras** | EAN de 8, 12, 13 ou 14 dígitos, ou vazio. | 7891234567895 |
| **NCM** | 8 dígitos, ou vazio. | 48191000 |
| **Categorias** | Caminhos separados por `;`, com cada nível separado por `>`. Categoria que não existe é criada. | Bolos > Caixas para bolo; Festa |
| **Materiais** | Separados por `;`. Material que não existe é criado. | Papel; Plástico |
| **Tipo de venda** | `unidade` ou `peso` (obrigatório). | unidade |
| **Controla validade** | S ou N (vazio é N). | N |
| **Forno, Freezer, Micro-ondas, Alimento** | S ou N (vazio é N). | S |
| **Estoque mínimo (un ou g)** | Número inteiro: em **un** no produto por unidade e em **g** no produto por peso. Vazio é 0. | 50 |
| **Comprimento (mm), Largura (mm), Altura (mm), Capacidade (ml)** | Números inteiros, ou vazio. | 150 |

Produto, NCM, Categorias, Materiais, Tipo de venda, Controla validade, Forno, Freezer, Micro-ondas e Alimento são **do produto**. Todas as linhas do mesmo produto precisam ter o mesmo valor nessas colunas.

## 3. Aba Formas de venda: uma linha por preço

| Coluna | O que vai | Exemplo |
|---|---|---|
| **Código interno** | O da variação. | CX-15 |
| **Forma** | Nome da forma de venda. | Pacote com 10 |
| **Fator** | Quantas unidades (ou gramas) vêm na forma. | 10 |
| **Quantidade mínima** | **1** = o preço normal. **2 ou mais** = uma faixa de preço (a partir de quantas formas). | 1 |
| **Preço (R$)** | Em reais. | 15,00 |

Exemplo: o pacote com 10 custa R$ 15,00, e a partir de 5 pacotes custa R$ 14,00 cada:

| Código interno | Forma | Fator | Quantidade mínima | Preço (R$) |
|---|---|---|---|---|
| CX-15 | Pacote com 10 | 10 | 1 | 15,00 |
| CX-15 | Pacote com 10 | 10 | 5 | 14,00 |

Regras:

- toda forma precisa da linha com quantidade mínima **1**;
- as linhas da mesma forma têm o mesmo fator;
- cada faixa custa menos que o preço normal e menos que a faixa anterior;
- **produto por peso** tem uma forma só, com fator **1000** e o preço do **kg**, sem faixas (ex.: `GR-1 | Granel | 1000 | 1 | 32,00`).

## 4. A planilha manda

Quando você importa, nas variações que estão na planilha **vale o que está nela**:

- **célula vazia apaga** o que estava (código de barras, NCM, medidas, categorias, materiais);
- se a variação tem linhas na aba **Formas de venda**, ela fica **só com essas formas**. A forma que sumiu da planilha é **desativada** (não é apagada; dá para reativar na ficha), e a faixa que sumiu é apagada;
- se a variação **não** tem nenhuma linha na aba Formas de venda, as formas dela não mudam;
- variação que **não está** na planilha não muda.

Por isso, o jeito mais seguro de corrigir o catálogo é **Exportar catálogo**, mudar só o que precisa e importar de volta.

**Acrescentar uma variação a um produto que já existe:** acrescente uma linha com o **mesmo nome de produto** e um código interno novo. Se houver mais de um produto com esse nome, a prévia avisa, e aí a variação se acrescenta pela ficha do produto.

## 5. Conferir e importar

1. Na caixa **Importar**, clique em **Planilha (.xlsx)** e escolha o arquivo.
2. Clique em **Conferir planilha**. Nada é gravado ainda. Aparece o resumo, por exemplo **3 criado(s), 1 atualizado(s) e 40 sem mudança.** (conta variações).
3. Se houver erros, aparece a tabela **Erros da planilha**, com **Aba**, **Linha** (a linha do Excel), **Coluna** e **Problema**. Corrija na planilha e confira de novo. **Com qualquer erro, nada é importado.**
4. Sem erros, clique em **Importar planilha** e confirme. Aparece **Planilha importada: 3 criado(s) e 1 atualizado(s).** A importação é **tudo ou nada**: se algo der errado no meio, nada fica gravado.

Se a planilha for igual ao catálogo, aparece **Nada a importar: a planilha é igual ao catálogo.**

Os erros mais comuns:

| Mensagem | O que fazer |
|---|---|
| **O NCM precisa ter 8 dígitos.** | Confira o NCM. (Se o Excel tirou o zero da frente, o sistema já completa sozinho.) |
| **Código de barras inválido.** | O último dígito não confere: confira o número na embalagem. |
| **Informe o preço em reais, por exemplo 6,00.** | Use vírgula para os centavos. Escrito como texto, "12.50" é recusado, porque o ponto pode ser de milhar. |
| **Este código interno aparece em mais de uma linha.** | Cada variação tem uma linha só na aba Variações. |
| **As linhas do mesmo produto precisam ter o mesmo valor nesta coluna.** | Iguale a coluna nas linhas do produto. |
| **Este código de barras já está em outra variação.** | Cada código de barras é de uma variação só. |
| **Falta a linha com quantidade mínima 1 (o preço normal) desta forma.** | Acrescente a linha do preço normal. |
| **Não dá para mudar o tipo de venda…** ou **…o controle de validade…** | O produto já tem estoque ou formas de venda: isso não muda pela planilha. |

Limites: arquivo de até 4 MB e até 5.000 linhas em cada aba.
