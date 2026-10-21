# Fase 1: Base (produtos, estoque e usuários)

- **Data:** 2026-10-21
- **Situação:** aprovada em 2026-10-21
- **Visão geral do projeto:** [README](../../../README.md)

## 1. Objetivo

Colocar todo o catálogo da loja e as regras do estoque dentro do sistema, de modo que as fases seguintes (balcão, loja online e gestão) só usem essa base, sem precisar refazê-la.

A fase 1 é usada só pela equipe da loja. Nenhum cliente acessa nada.

## 2. Critérios de pronto

A fase 1 está pronta quando todas as condições abaixo forem verdadeiras:

1. Todos os produtos da loja estão cadastrados na produção, com situação "ativo" ou "incompleto".
2. Todos os testes automáticos da seção 11 passam.
3. Três notas reais foram importadas e conferem, item a item, com a nota em papel: quantidade, custo, lote e validade.
4. O ensaio de contagem de uma prateleira foi concluído pelo inventário. Depois da aprovação, o saldo de cada item contado é igual ao que foi contado, e o tempo gasto fica anotado para planejar a contagem oficial da fase 2.
5. Um backup da produção foi restaurado com sucesso num banco separado.
6. O manual em `docs/manual/` cobre as tarefas da seção 12.

## 3. Fora do escopo

| Fica para depois | Fase |
|---|---|
| Vendas no balcão e caixa | 2 |
| Leitura de código de barras pela câmera do celular | 2 |
| Contagem oficial da loja inteira | Início da 2 |
| Reservas, site público, pagamento e cadastro de clientes | 3 |
| Granel no site em porções fixas e validade mínima para venda online | 3 |
| Preço por tipo de cliente (se for necessário) | 3 |
| Nota fiscal de saída (NFC-e/NF-e) | 4, ou antes se o contador recomendar |
| Busca automática de notas na SEFAZ | 4 |
| Painel de vendas, margem, curva ABC, fornecedores e pedidos de compra | 4 |
| Avisos por e-mail ou WhatsApp (na fase 1 os avisos aparecem só no painel) | 3 |

## 4. Arquitetura

- **Aplicativo:** Next.js (App Router) com TypeScript, Tailwind CSS e shadcn/ui, hospedado na Vercel. A interface é em português do Brasil, com moeda em R$, datas no formato dd/mm/aaaa e fuso horário `America/Sao_Paulo`. Funciona no computador e no celular; a tela de contagem do inventário é pensada primeiro para o celular.
- **Dados:** Supabase (Postgres, Auth, Storage e pg_cron).
- **E-mails de acesso:** os convites e a recuperação de senha saem por um serviço de e-mail próprio (Resend, no plano gratuito), configurado no Supabase. O envio padrão do Supabase só entrega para os membros da equipe do projeto no Supabase.
- **Regras no banco:** toda alteração de estoque acontece por funções do Postgres que o aplicativo chama. O usuário logado não tem permissão para inserir, alterar ou apagar diretamente nas tabelas de estoque. Cada função roda numa transação: ou tudo acontece, ou nada.
- **Permissões:** Row Level Security em todas as tabelas. O papel de cada usuário vem da tabela `usuarios`.
- **XML e planilhas:** a leitura dos arquivos acontece no servidor do Next.js. A gravação passa pelas funções do banco.
- **Ambientes:**

  | Ambiente | Para quê | Banco |
  |---|---|---|
  | Local | Desenvolvimento e testes no computador | Supabase CLI (precisa de Docker Desktop) |
  | Teste | Endereços de pré-visualização da Vercel | Projeto Supabase gratuito |
  | Produção | Endereço principal, dados reais da loja | Projeto Supabase Pro |

- **Mudanças no banco:** viram arquivos de migração versionados em `supabase/migrations/`, aplicados primeiro no ambiente de teste e depois na produção.
- **Código:** fica num repositório privado no GitHub. Cada mudança passa por branch, testes automáticos (GitHub Actions), pré-visualização, aprovação e só então produção.

## 5. Convenções de dados

- **Quantidade:** sempre um número inteiro, na unidade base da variação. É "unidade" para produtos vendidos por unidade e "grama" para produtos vendidos por peso.
- **Preço de venda:** em centavos (número inteiro).
- **Custo unitário:** em reais por unidade base, com 6 casas decimais (`numeric(14,6)`), porque o custo de uma forminha ou de um grama tem frações de centavo.
- **Arredondamento de dinheiro:** para o centavo mais próximo; meio centavo arredonda para cima.
- **Preço por peso:** `arredondar(preço_por_kg_em_centavos × gramas ÷ 1000)`.
- **Validade:** é uma data, e o produto vale até o fim desse dia. "Vencido" significa validade anterior a hoje, no fuso de São Paulo.
- **Tabelas com custo:** nenhuma tabela que o funcionário consegue ler contém custo (ver seção 8).

## 6. Modelo de dados

### 6.1 Cadastro

**produtos**
- Campos: id, nome, descrição, tipo_venda (`unidade` | `peso`), controla_validade, ncm (8 dígitos), cest (opcional, 7 dígitos), origem_fiscal (0 a 8), apto_forno, apto_freezer, apto_microondas, apto_alimento, situacao (`incompleto` | `ativo` | `inativo`), criado_em, atualizado_em.
- Para virar `ativo`, o produto precisa de:
  - pelo menos uma variação ativa com uma forma de venda;
  - pelo menos uma categoria;
  - pelo menos uma foto;
  - NCM válido.

  Enquanto faltar alguma dessas coisas, fica `incompleto`. Um produto incompleto já funciona no estoque; só não vai aparecer no site, a partir da fase 3.
- O sistema muda sozinho entre `incompleto` e `ativo`, conforme os requisitos forem cumpridos ou deixarem de ser. Só o administrador escolhe `inativo`, e essa escolha prevalece até ele reativar o produto.

**categorias**
- Campos: id, nome, categoria_pai_id (para subcategorias), ordem.
- O nome não se repete dentro da mesma categoria pai.
- Um produto pode estar em várias categorias, pela tabela **produto_categorias**.

**etiquetas**
- Campos: id, nome (materiais como kraft, PET, PP e alumínio).
- Ligação com produtos pela tabela **produto_etiquetas**.

**fotos**
- Campos: id, produto_id, variacao_id (opcional), caminho no Storage, ordem.
- Aceita JPG, PNG ou WebP, até 5 MB cada e até 8 por produto.

**variacoes**
- Campos: id, produto_id, nome (ex.: "nº 4 marrom"), codigo_interno, codigo_barras (opcional), atributos (pares chave e valor, como tamanho, cor ou capacidade), comprimento_mm, largura_mm, altura_mm, capacidade_ml, estoque_minimo (na unidade base), ativa.
- O `codigo_interno` não se repete. Se ficar vazio na tela de cadastro, o sistema gera um no formato `P000001`.
- O `codigo_barras` não se repete quando preenchido, e o dígito verificador GTIN precisa ser válido.
- Todo produto tem pelo menos uma variação.

**formas_venda**
- Campos: id, variacao_id, nome (ex.: "Pacote com 100"), fator (unidades base por forma; ex.: 100), preco_centavos, peso_variavel, ativa.
- Produto por unidade: `peso_variavel = falso`.
- Produto por peso: exatamente uma forma "Granel" com `peso_variavel = verdadeiro`, `fator = 1000` e preço por kg. As porções fixas da fase 3 (100 g, 250 g) cabem neste mesmo modelo, com fator 100 ou 250.

**faixas_preco**
- Campos: forma_venda_id, quantidade_minima (2 ou mais, contada em número de formas), preco_centavos (preço de cada forma nessa faixa).
- Dentro de uma mesma forma, as quantidades mínimas são diferentes entre si e o preço cai conforme a quantidade sobe.
- Não existem faixas para formas de peso variável.

**compatibilidades**
- Campos: variacao_a_id, variacao_b_id, descricao (ex.: "tampa serve no pote").
- Vale nos dois sentidos, e o mesmo par não se repete.

### 6.2 Fornecedores e notas

**fornecedores**
- Campos: id, cnpj (único), nome.
- Criados ou atualizados a partir do emitente do XML.

**fornecedor_itens** (a "ligação" que o sistema lembra)
- Campos: fornecedor_id, codigo_fornecedor, unidade_fornecedor (ex.: `CX`), descricao_fornecedor, codigo_barras, variacao_id, fator (unidades base por unidade do fornecedor).
- Única por fornecedor + código + unidade.

**notas_entrada**
- Campos: id, chave_acesso (44 dígitos, única), fornecedor_id, numero, serie, emitida_em, caminho do XML original no Storage, situacao, importada_por, importada_em, confirmada_por, confirmada_em.
- Situações possíveis: `em_revisao` | `aguardando_administrador` | `confirmada` | `descartada`.

**notas_entrada_itens**
- Campos: nota_id, numero_item, codigo_fornecedor, descricao, codigo_barras, ncm, unidade, quantidade_nota (como está no XML), variacao_id, fator, quantidade_base_nota, quantidade_base_recebida.
- A divergência com o fornecedor é a diferença entre `quantidade_base_nota` e `quantidade_base_recebida`.

**notas_entrada_item_lotes**
- Campos: item_id, codigo_lote, validade, quantidade_base.
- Um mesmo item da nota pode trazer vários lotes.

**notas_entrada_itens_valores** (só administrador)
- Campos: item_id, valor_produto, desconto, frete, seguro, outras_despesas, ipi, icms_st, custo_total, custo_unitario_base.

### 6.3 Estoque

**lotes**
- Campos: id, variacao_id, codigo, validade, criado_em.
- A validade é obrigatória quando o produto controla validade. Quando não controla, a validade fica vazia, e cada variação tem um único lote interno `GERAL`, criado automaticamente e invisível nas telas.
- O código não se repete dentro da mesma variação.

**saldos**
- Campos: variacao_id, lote_id, quantidade.
- A quantidade nunca fica negativa (`CHECK (quantidade >= 0)`).
- É uma cópia de leitura rápida da soma das movimentações.

**movimentacoes**
- Campos: id, variacao_id, lote_id, tipo, quantidade, motivo, origem, origem_id, estorno_de, usuario_id, aprovado_por, criado_em.
- A quantidade é positiva quando entra e negativa quando sai. Nunca é zero.
- Tipos na fase 1: `entrada_nota`, `entrada_manual`, `ajuste_inventario`, `ajuste_manual`, `perda_vencimento`, `perda_avaria`, `quebra_pesagem`, `estorno`. Os tipos de venda e reserva entram nas fases 2 e 3.
- Ninguém altera nem apaga uma movimentação: um gatilho no banco bloqueia `UPDATE` e `DELETE`.

**movimentacoes_custos** (só administrador)
- Campos: movimentacao_id, custo_unitario.
- O custo de um lote é calculado a partir das entradas dele.

**custos_variacao** (só administrador)
- Campos: variacao_id, custo_medio, atualizado_em.

**solicitacoes_ajuste**
- Campos: id, variacao_id, lote_id, tipo (`ajuste_manual` | `perda_avaria` | `perda_vencimento` | `quebra_pesagem`), quantidade, motivo, solicitado_por, solicitado_em, situacao (`pendente` | `aprovada` | `recusada`), decidido_por, decidido_em.

**inventarios**
- Campos: id, descricao, escopo (`loja` | `categorias` | `variacoes`), itens do escopo, situacao (`aberto` | `em_revisao` | `aprovado` | `cancelado`), aberto_por, aberto_em, aprovado_por, aprovado_em.

**inventario_itens**
- Campos: inventario_id, variacao_id, lote_id, saldo_no_momento, quantidade_contada, contado_por, contado_em.
- Se o mesmo item for contado de novo, a nova contagem substitui a anterior.

### 6.4 Configuração e auditoria

**usuarios**
- Campos: id (do Supabase Auth), nome, email, papel (`administrador` | `funcionario`), ativo, criado_em.

**configuracoes**
- Campos: cnpj_loja, limite_ajuste_centavos (padrão 5000), dias_alerta_validade (padrão 30, 15 e 7).

**historico_cadastro**
- Campos: tabela, registro_id, campo, valor_antigo, valor_novo, usuario_id, em.
- É preenchida por gatilhos nas tabelas produtos, variacoes, formas_venda, faixas_preco, categorias, fornecedor_itens, usuarios e configuracoes.

**verificacoes_integridade**
- Campos: executada_em, divergencias (lista de variação + lote em que o saldo é diferente da soma das movimentações).

## 7. Regras do estoque (dentro do banco)

- **R1. Saldo nunca negativo.**
  - Garantido pelo `CHECK` da tabela de saldos.
  - Qualquer função que deixaria um saldo negativo falha e desfaz tudo o que fez.
- **R2. Nada se apaga.**
  - As movimentações são imutáveis. Um erro se corrige com estorno: uma movimentação de quantidade oposta, com `estorno_de` preenchido.
  - Cada movimentação pode ser estornada uma única vez, e um estorno não pode ser estornado.
  - O estorno de uma entrada que deixaria o saldo negativo é recusado.
  - Todos os dias às 03:00, o pg_cron compara os saldos com a soma das movimentações e grava o resultado em `verificacoes_integridade`. Se houver qualquer diferença, aparece um aviso no painel do administrador.
- **R3. Sai primeiro o que vence primeiro.**
  - A função `retirar_fefo(variacao, quantidade)` percorre os lotes com saldo maior que zero e que não estão vencidos, em ordem crescente de validade. Em caso de empate, vai primeiro o lote criado antes.
  - A saída é dividida entre os lotes conforme necessário.
  - A função é criada e testada na fase 1, mas nenhuma tela da fase 1 a usa. A venda da fase 2 vai usá-la.
- **R4. Lote vencido não sai pela R3.**
  - Ele só sai como `perda_vencimento`.
- **R5. Em perdas e ajustes, o lote é informado explicitamente.**
- **R6. Quantidades sempre inteiras.**
  - A conversão acontece pelo fator.
  - Se uma entrada de nota não der um número inteiro depois da conversão, ela é recusada com uma mensagem indicando o item e o fator.
- **R7. Produto que controla validade exige a data de validade na entrada.**
  - O código do lote é opcional. Se ficar vazio, o sistema gera `ENT-AAAA-MM-DD`, e se repetir no mesmo dia acrescenta `-2`, `-3` e assim por diante.
  - Uma entrada num lote que já existe (mesma variação e mesmo código) soma ao lote. Se a validade for diferente da que já está registrada, a entrada é recusada.
- **R8. Ajustes e perdas exigem um motivo.**
  - O valor da operação é `|quantidade| × custo médio`.
  - Funcionário acima de `limite_ajuste_centavos`: vira uma solicitação pendente, que o administrador aprova ou recusa.
  - Se a variação ainda não tem custo médio (nunca teve entrada), todo ajuste ou perda registrado por funcionário vira solicitação, qualquer que seja a quantidade.
  - O administrador não tem limite.
  - O ajuste de inventário sempre passa pela aprovação do administrador.
- **R9. Custo médio.**
  - Na entrada: `novo = (saldo_total × custo_medio + qtd × custo_unit) ÷ (saldo_total + qtd)`, em que `saldo_total` é a soma de todos os lotes antes da entrada. Se `saldo_total = 0`, o novo custo médio é o custo da própria entrada.
  - Perdas e ajustes não mudam o custo médio.
  - O estorno de uma entrada recalcula o custo médio retirando aquela entrada. Se o resultado ficar negativo, ou se o saldo restante for zero, o custo médio anterior é mantido.
- **R10. Operações ao mesmo tempo.**
  - As funções travam as linhas de saldo envolvidas (`SELECT … FOR UPDATE`) sempre na mesma ordem, por `lote_id`, para que duas operações nunca fiquem esperando uma pela outra para sempre.

### Inventário

- **Abertura:** define o escopo, que pode ser a loja inteira, algumas categorias ou uma lista de variações.
- **Contagem:**
  - Pode ser digitada em formas de venda ("3 caixas + 4 pacotes"), e o sistema converte para a unidade base. Produtos por peso são contados em gramas, ou em kg com 3 casas decimais.
  - O `saldo_no_momento` é gravado na hora de cada contagem.
  - Se a pessoa encontrar na prateleira um lote que o sistema não conhece, informa a validade (obrigatória) e o código (opcional; se ficar vazio, o sistema gera `INV-AAAA-MM-DD`, com a mesma regra de repetição da R7). O lote é criado com saldo zero antes da contagem.
- **Aprovação:**
  - Para cada item contado, o ajuste é `contado − saldo_no_momento`. Assim, as movimentações que aconteceram depois da contagem são preservadas.
  - Itens não contados não geram ajuste. Para zerar um item, é preciso contar 0 de forma explícita.
  - A aprovação gera movimentações `ajuste_inventario` com o motivo "Inventário nº {id}". Se algum ajuste violar a R1, a aprovação inteira falha e mostra qual item causou o problema.

## 8. Usuários e permissões

| Ação | Administrador | Funcionário |
|---|---|---|
| Ver produtos, preços, lotes, saldos, extrato (sem custo) e alertas | ✓ | ✓ |
| Importar nota, preencher lote, validade e quantidade recebida | ✓ | ✓ |
| Confirmar nota em que todos os itens já estão ligados | ✓ | ✓ |
| Ligar item novo de fornecedor ou criar produto a partir da nota | ✓ | ✗ (a nota fica "aguardando administrador") |
| Entrada manual (sem nota) | ✓ | ✗ |
| Registrar perda ou ajuste dentro do limite | ✓ | ✓ |
| Registrar perda ou ajuste acima do limite | ✓ | Vira solicitação |
| Contar inventário | ✓ | ✓ |
| Abrir, aprovar ou cancelar inventário | ✓ | ✗ |
| Estornar movimentação | ✓ | ✗ |
| Ver custos e valores da nota | ✓ | ✗ |
| Cadastro, preços, categorias, planilhas | ✓ | ✗ |
| Usuários e configurações | ✓ | ✗ |

- **Acesso:**
  - O acesso é só por convite enviado por e-mail (Supabase Auth). Não existe cadastro aberto.
  - A verificação em duas etapas (TOTP) é obrigatória para o administrador.
- **Desativação:**
  - Um usuário desativado não consegue mais entrar, mas o histórico dele continua guardado.
  - Sempre precisa existir pelo menos um administrador ativo. O sistema não deixa desativar nem rebaixar o último.
- **Tabelas que só o administrador lê:** `notas_entrada_itens_valores`, `movimentacoes_custos` e `custos_variacao`.
- **Telas do funcionário:** as telas exclusivas do administrador não aparecem para o funcionário.

## 9. Importação

### 9.1 XML da nota de compra

- **O que é aceito:** arquivos `.xml` de NF-e modelo 55 autorizada (`nfeProc` com protocolo). Até 50 arquivos por vez.
- **O que é recusado, com mensagem:**
  - arquivo inválido;
  - nota sem autorização;
  - destinatário com CNPJ diferente de `configuracoes.cnpj_loja`;
  - chave já importada (a mensagem mostra quando e por quem foi importada).
- **O que é lido do XML:**
  - emitente: CNPJ e nome;
  - número, série e data;
  - itens: em `det/prod`, os campos `cProd`, `cEAN`, `xProd`, `NCM`, `uCom`, `qCom`, `vProd`, `vDesc`, `vFrete`, `vSeg` e `vOutro`;
  - lotes: em `rastro`, os campos `nLote`, `qLote` e `dVal`;
  - impostos: `vIPI` e `vICMSST`.
- **Ligação dos itens:**
  - Para cada item, o sistema procura uma ligação já guardada em `fornecedor_itens` (fornecedor + `cProd` + `uCom`).
  - Se não encontrar, sugere uma variação pelo código de barras. A sugestão precisa ser confirmada pelo administrador.
  - Se algum item ficar sem ligação, a nota fica `aguardando_administrador`.
- **Cálculos:**
  - Quantidade base da nota = `qCom × fator`, que precisa dar um número inteiro (R6).
  - Custo do item = `vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vICMSST`.
  - Custo unitário base = custo do item ÷ quantidade base da nota. A conta usa a quantidade da nota (o que foi pago), não a quantidade recebida. A composição desse custo ainda precisa ser confirmada com o contador (seção 13).
- **Lotes:** vêm do `rastro` quando a nota traz essa informação. Caso contrário, são digitados. A soma das quantidades dos lotes precisa ser igual à quantidade recebida.
- **Quantidade recebida:** começa igual à da nota e pode ser alterada. A diferença aparece na lista de divergências com o fornecedor.
- **Confirmação:**
  - Uma única função do banco cria os lotes, as movimentações `entrada_nota` e os custos, e atualiza o custo médio. Tudo ou nada.
  - Uma nota confirmada não pode mais ser editada. Para corrigir, o administrador estorna as movimentações dela.
- **Descarte:** uma nota em revisão pode ser descartada, sem nenhum efeito no estoque. A chave fica liberada para importar de novo.
- **Arquivo original:** o XML original fica guardado no Storage.

### 9.2 Planilha (só administrador)

- **Modelo:** um arquivo `.xlsx` baixado do próprio sistema, com duas abas:
  - **Variações**, com uma linha por variação e as colunas: Produto, Variação, Código interno (obrigatório), Código de barras, NCM, Categorias (caminhos separados por `;`, por exemplo `Bolos > Caixas para bolo`), Materiais (separados por `;`), Tipo de venda (`unidade` ou `peso`), Controla validade (S/N), Forno, Freezer, Micro-ondas e Alimento (S/N), Estoque mínimo, Comprimento, Largura e Altura (mm), Capacidade (ml).
  - **Formas de venda**, com uma linha por preço e as colunas: Código interno, Forma (ex.: "Pacote com 100"), Fator, Quantidade mínima (1 = preço normal; 2 ou mais = faixa), Preço (R$).
- **Como as linhas são casadas:**
  - Pelo código interno: se já existe, a linha atualiza; se não existe, cria.
  - Linhas novas com o mesmo valor na coluna Produto viram variações do mesmo produto.
  - Numa linha que já existe, a coluna Produto renomeia o produto daquela variação. Se duas linhas do mesmo produto trouxerem nomes diferentes, isso conta como erro.
  - Categorias e materiais que ainda não existem são criados.
- **Pré-visualização:** antes de importar, aparecem a quantidade de itens criados, atualizados e sem mudança, e a lista de erros por linha e coluna. A importação só acontece quando não há nenhum erro, e é tudo ou nada.
- **Estoque e custo:** a planilha nunca mexe no estoque nem no custo.
- **Exportação:** o catálogo atual pode ser exportado no mesmo modelo, para editar e importar de volta.

### 9.3 Ferramentas de cadastro em massa

- **Grade de variações:** na ficha do produto, você informa os atributos e seus valores (ex.: Tamanho 4, 6 e 12; Cor marrom e branca), e o sistema cria todas as combinações que ainda não existem.
- **Edição em massa:** na lista de produtos, você seleciona vários e aplica uma destas ações:
  - reajuste de preço em %, arredondado ao centavo;
  - incluir ou remover uma categoria;
  - inativar ou reativar.

  A ação vale para todas as formas de venda e faixas das variações selecionadas.

## 10. Telas

1. **Entrar:** e-mail e senha, código de duas etapas para o administrador e recuperação de senha.
2. **Início:** avisos de lotes vencendo, vencidos com saldo, produtos abaixo do mínimo, solicitações pendentes, notas aguardando o administrador e falhas na conferência diária.
3. **Produtos:**
   - lista com busca por nome, código interno, código de barras ou nome do fornecedor;
   - filtros por categoria, situação, tipo de venda, controle de validade e material;
   - ficha do produto, grade de variações e edição em massa;
   - importação e exportação de planilha.
4. **Categorias e materiais.**
5. **Notas de entrada:** importar XML, lista por situação, revisão item a item, confirmação e divergências com fornecedores.
6. **Entrada manual** (só administrador).
7. **Estoque:**
   - saldo por variação e por lote, com a validade;
   - extrato de movimentações com filtros;
   - registro de perda ou ajuste;
   - estorno (só administrador);
   - solicitações pendentes.
8. **Inventário:** abrir com escopo, contar pelo celular buscando por nome ou código (em formas de venda ou em gramas), revisar as diferenças, aprovar ou cancelar.
9. **Alertas:** lotes que vencem em 30, 15 ou 7 dias, lotes vencidos com saldo e produtos abaixo do estoque mínimo.
10. **Usuários e configurações** (só administrador).

## 11. Testes e verificação

**Banco** (pgTAP, rodando com `supabase test db`): um teste para cada regra (R1 a R10), para o inventário e para a importação, incluindo estes casos:
- saldo 30 e retirada de 31: a retirada é recusada e nada muda;
- lote A com 200 g (vence em 10/03) e lote B com 5.000 g (vence em 22/05), retirada de 350 g: saem 200 g do A e 150 g do B;
- um lote vencido é ignorado por `retirar_fefo`;
- a mesma chave de acesso importada duas vezes: a segunda é recusada;
- estorno duplo é recusado; `UPDATE` ou `DELETE` em movimentações é recusado;
- custo médio depois de duas entradas com custos diferentes, e depois do estorno de uma delas;
- o funcionário não consegue ler as tabelas de custo, e uma perda dele acima do limite vira solicitação;
- inventário: o ajuste é `contado − saldo_no_momento`, preservando as movimentações feitas depois da contagem;
- não dá para desativar o último administrador.

**Operações ao mesmo tempo:** um teste de integração em TypeScript (Vitest) abre duas conexões ao mesmo tempo, as duas tentam retirar a última unidade, e exatamente uma consegue.

**Código** (Vitest):
- leitura do XML, usando notas reais com os dados sensíveis trocados;
- cálculo de custo, conversão pelo fator e lotes do `rastro`;
- leitura da planilha e mensagens de erro;
- preço por peso e por faixas.

**Telas** (Playwright):
- entrar no sistema;
- importar uma nota, revisar, confirmar e conferir o saldo;
- fazer um inventário do começo ao fim;
- verificar que o funcionário não vê nenhum custo.

**Automação:** o GitHub Actions roda tudo isso a cada mudança. Se algum teste falhar, a mudança não é publicada.

**Verificação fora do código:** são os critérios 3, 4 e 5 da seção 2 (notas reais comparadas com o papel, ensaio de contagem e restauração de backup).

## 12. Manual de operação (`docs/manual/`)

Escrito em português, à medida que cada tela fica pronta. Cobre como:

- cadastrar um produto e montar a grade de variações;
- importar uma nota e ligar itens novos de um fornecedor;
- fazer uma entrada manual;
- registrar uma perda e estornar uma movimentação;
- fazer um inventário e aprovar solicitações;
- importar e exportar a planilha;
- convidar e desativar usuários;
- baixar uma cópia de segurança (todo mês) e restaurar um backup.

## 13. Pendências fora do código

- Confirmar com o contador a composição do custo da seção 9.1 e a orientação sobre a emissão de nota (antes da fase 3).
- Criar as contas no GitHub, na Vercel, no Supabase e no Resend, em nome da loja.
- Contratar o Vercel Pro e o Supabase Pro antes de a loja começar a usar o sistema de verdade.
- Juntar os XMLs das notas de compra dos últimos 6 a 12 meses, com o contador ou com os fornecedores.
- Informar o CNPJ da loja para a configuração.
- Instalar o Docker Desktop no computador de desenvolvimento, para rodar os testes do banco localmente.

## 14. Anotado para as próximas fases

- **Fase 2:**
  - como o caixa resolve o caso "o sistema diz zero, mas o cliente está com o produto na mão";
  - leitura de código de barras pela câmera;
  - contagem oficial da loja inteira, lote por lote, antes de o balcão começar a funcionar.
- **Fase 3:**
  - granel no site em porções fixas;
  - validade mínima para venda online;
  - preço por tipo de cliente, se for necessário;
  - LGPD para os dados de clientes;
  - avisos por e-mail e WhatsApp.
- **Fase 4:** busca automática de notas na SEFAZ, que exige o certificado digital da empresa.
