# Sistema da Loja: compra online, retirada na loja e gestão

Sistema próprio para uma loja física de embalagens, descartáveis e artigos de confeitaria e festas. Junta num lugar só:

- **loja online:** o cliente escolhe os produtos, paga e retira na loja;
- **gestão da loja (o "ERP"):** produtos, estoque, vendas no balcão e indicadores.

O princípio que guia tudo: **um estoque só, compartilhado entre o site e o balcão.** Se o site mostra que tem, a prateleira tem.

## Situação

| Fase | O que entrega | Situação |
|---|---|---|
| 1. Base | Produtos, estoque (com lote, validade e peso), importação de notas e planilhas, usuários | Especificação aprovada; plano de implementação a fazer |
| 2. Balcão | Vendas no balcão saindo do mesmo estoque; contagem oficial da loja inteira | Não iniciada |
| 3. Loja online e retirada | Site público, pagamento (Pix e cartão), pedidos e retirada | Não iniciada |
| 4. Gestão | Painel de vendas, conferência de pagamentos, fornecedores, nota fiscal (NFC-e) | Não iniciada |

Cada fase só começa depois que a anterior estiver pronta e aprovada. A nota fiscal pode vir antes da fase 4 se o contador recomendar; o cadastro já guarda os dados fiscais desde a fase 1.

## Decisões tomadas

| Decisão | Por quê |
|---|---|
| Construir em fases, cada uma com especificação aprovada antes do código | Qualidade e participação em cada decisão |
| Balcão (fase 2) antes do site (fase 3) | Sem as vendas do balcão no sistema, o site mostraria produto que já acabou |
| Balcão começa sem emitir nota fiscal | Hoje a loja vende pela maquininha e emite nota só quando o cliente pede; o cadastro já guarda o NCM para ligar a emissão depois |
| Estoque controla lote e validade, por produto | Chocolate, corante, granulado e afins são parte importante das vendas |
| Estoque aceita venda por peso (em gramas, preço por kg) | Há produtos a granel pesados na hora |
| Importação por XML de nota e por planilha já na fase 1 | Catálogo de 300 a 1.000 produtos |
| Serviços gerenciados, testes automáticos, cópia de teste e manual em português | Quem cuida do sistema é quem administra a loja, com ajuda do Claude, sem programar |
| Vercel + Supabase, com Next.js e TypeScript | Escolha da loja; nenhum servidor para administrar |
| Regras do estoque dentro do banco de dados | Torna impossível vender a mesma unidade duas vezes, venha a venda de onde vier |
| Inventário da fase 1 por nome ou código; câmera do celular na fase 2 | Usa a mesma tecnologia do leitor de código de barras do balcão |

## Fase 1 em resumo

Telas (só para a equipe): entrar, produtos, categorias, entrada de mercadoria, estoque, inventário, alertas e usuários.

**Pronta quando:**

- todos os produtos estiverem cadastrados;
- os testes das regras do estoque passarem;
- um ensaio de contagem de uma prateleira for concluído, com o saldo final igual ao contado.

A contagem oficial da loja inteira acontece no início da fase 2, logo antes de o balcão começar a funcionar.

Especificação completa: [docs/superpowers/specs/2026-10-21-fase-1-base-design.md](docs/superpowers/specs/2026-10-21-fase-1-base-design.md)

## Tecnologia e custos

- **Next.js + TypeScript**, hospedado na **Vercel**
- **Supabase:** banco de dados (Postgres), login, fotos dos produtos e backup diário
- **Custos:** durante o desenvolvimento, planos gratuitos. Em uso real: Vercel Pro (~US$ 20/mês) + Supabase Pro (~US$ 25/mês), mais o domínio .com.br (~R$ 40/ano). Confirmar os valores na contratação.

## Como trabalhamos

1. Cada fase tem uma especificação escrita e aprovada, guardada em `docs/superpowers/specs/`.
2. Depois vem um plano de implementação passo a passo.
3. O código é escrito com testes automáticos. Nenhuma mudança vai ao ar sem os testes passarem.
4. Toda mudança aparece primeiro numa cópia de teste (endereço de pré-visualização da Vercel).
5. Toda mudança fica no histórico (git) e pode ser desfeita.

## Glossário

- **Variação (SKU):** cada item com estoque e preço próprios. Exemplo: forminha nº 4 marrom.
- **Lote:** quantidade de um produto que chegou junta, com a mesma validade.
- **FEFO:** "o que vence primeiro sai primeiro".
- **NCM:** código fiscal do produto, usado na nota.
- **NFC-e:** nota fiscal eletrônica do consumidor, a nota do balcão.
- **Inventário:** contagem física do estoque para conferir com o sistema.
- **XML da nota:** arquivo digital da nota fiscal de compra, enviado pelo fornecedor.
