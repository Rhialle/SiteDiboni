# Cadastrar um produto

Só o administrador cadastra e muda produtos. O funcionário vê tudo, mas sem botões de edição.

## 1. Criar o produto

1. Em **Produtos**, clique em **Novo produto**.
2. Preencha:
   - **Nome** e **Descrição**;
   - **Tipo de venda**: **Por unidade** (pacotes, caixas, unidades) ou **Por peso (a granel)**;
   - **Controla validade (lote)**, se o produto tem data de validade (chocolate, corante, granulado…);
   - **Dados fiscais**: **NCM** (8 dígitos), **CEST** (7 dígitos, se houver) e **Origem**;
   - **Uso**: forno, freezer, micro-ondas, contato com alimento;
   - **Categorias** e **Materiais**.
3. Em **Primeira variação**:
   - **Nome da variação** (vazio = "Padrão");
   - **Código interno** (vazio = o sistema gera, como `P000001`);
   - **Código de barras**, se tiver. O sistema confere o dígito verificador.
4. Clique em **Criar produto**. Você cai na ficha do produto.

## 2. A situação do produto

No topo da ficha aparece um selo:

- **Incompleto:** ainda falta algo para o produto poder aparecer no site (fase 3). A frase "Para ficar ativo falta: …" diz o quê.
- **Ativo:** tem variação ativa com forma de venda, categoria, foto e NCM. O sistema muda sozinho para ativo quando tudo estiver completo.
- **Inativo:** você escolheu tirar o produto de uso, com **Inativar produto**. Fica assim até você clicar em **Reativar produto**, mesmo que o cadastro esteja completo.

Produtos e variações nunca são apagados (o estoque vai apontar para eles): são inativados.

## 3. Variações

Cada variação tem estoque e código próprios (ex.: "nº 4 marrom" e "nº 4 branca").

- **Nova variação:** preencha nome, códigos, medidas (mm), capacidade (ml) e estoque mínimo e clique em **Adicionar variação**.
- **Editar:** abra **Editar** na linha da variação e clique em **Salvar variação**.
- **Inativar/Reativar:** botão na linha da variação.

### Grade de variações

Para criar várias variações de uma vez, escreva em **Atributos da grade** um atributo por linha:

```
Tamanho: 4, 6, 12
Cor: marrom, branca
```

Clique em **Gerar variações**. O sistema cria todas as combinações que ainda não existem (aqui, 6). Pode repetir sem medo: ele não duplica.

## 4. Formas de venda e preço por quantidade

**Produto por unidade:** cada variação pode ser vendida de vários jeitos.

1. Em **Formas de venda**, preencha **Nome da forma** (ex.: "Pacote com 100"), **Quantidade na forma** (100) e **Preço (R$)** (6,00). Clique em **Adicionar forma**.
2. Para dar desconto por quantidade, dentro da forma preencha **A partir de** (10) e **Preço da faixa (R$)** (5,40) e clique em **Adicionar faixa**.
   - Cada faixa precisa ser mais barata que o preço normal e que a faixa anterior.
3. **Inativar forma** tira a forma de uso sem apagar.

**Produto por peso:** cada variação tem só o **Preço por kg (R$)**. Preencha e clique em **Salvar preço por kg**.

Trocar o tipo de venda só é possível quando as formas combinam com o novo tipo (por exemplo, um produto com "Pacote com 100" não vira "Por peso").

## 5. Fotos

- **Adicionar foto:** JPG, PNG ou WebP, até 5 MB, no máximo 8 por produto.
- As setas mudam a ordem; **Apagar** tira a foto.

## 6. Compatibilidades

Para dizer que "esta tampa serve neste pote":

1. Na ficha da tampa, em **Compatibilidades**, digite o **Código interno da outra variação** (o do pote) e uma **Descrição da ligação**.
2. Clique em **Ligar variações**. A ligação aparece nas duas fichas.
3. **Desligar** desfaz a ligação.
