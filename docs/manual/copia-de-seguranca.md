# Cópia de segurança

O sistema guarda os dados da loja em dois lugares do Supabase: o **banco** (produtos, estoque, notas, usuários) e o **Storage** (as fotos dos produtos e os XMLs originais das notas). A cópia de segurança copia os dois e prova que a cópia volta inteira.

## O que acontece sozinho

Todo **dia 1, às 03:00**, o GitHub roda a rotina **Cópia de segurança**, que:

1. exporta o banco inteiro (papéis, estrutura e dados);
2. baixa as fotos (`fotos-produtos`) e os XMLs das notas (`notas-xml`);
3. **restaura a cópia num Supabase vazio**, criado na hora numa máquina do GitHub, e **confere tabela por tabela** se o número de linhas é igual ao da cópia, e se o número de arquivos baixados é igual ao do Storage;
4. guarda tudo num pacote chamado `copia-AAAA-MM-DD`, por **90 dias** (sempre ficam as 3 últimas).

A rotina só **lê** o banco da loja; nunca muda nada nele.

> **Por enquanto, a rotina copia o banco de teste.** Quando o banco de produção existir, ela precisa passar a copiar a produção (veja [Trocar a origem para a produção](#trocar-a-origem-para-a-produção)).

## Onde achar e baixar uma cópia

1. No GitHub, abra o repositório e clique em **Actions**.
2. À esquerda, clique em **Cópia de segurança**.
3. Clique na execução que quer (as mais novas ficam em cima). A bolinha **verde** quer dizer que a cópia foi conferida.
4. No fim da página, em **Artifacts**, clique em `copia-AAAA-MM-DD` para baixar o arquivo `.zip`.

No resumo da execução aparecem as tabelas **Conferência do banco restaurado** (cada tabela, quantas linhas na cópia e quantas voltaram) e **Conferência dos arquivos**.

O `.zip` tem:

| Arquivo | O que é |
|---|---|
| `roles.sql` | os papéis do banco |
| `schema.sql` | a estrutura (tabelas, funções, regras) |
| `data.sql` | os dados |
| `arquivos/fotos-produtos/` | as fotos dos produtos |
| `arquivos/notas-xml/` | os XMLs das notas |
| `arquivos.txt` | quantos arquivos havia em cada depósito e quantos foram baixados |

**Cuidado:** o pacote tem os dados reais da loja (notas de fornecedores, e-mails da equipe). Se baixar, guarde num lugar seguro e não mande por e-mail ou WhatsApp.

## Fazer uma cópia na hora

Antes de algo arriscado (por exemplo, importar uma planilha grande do catálogo):

1. **Actions** → **Cópia de segurança** → botão **Run workflow** (à direita) → **Run workflow**.
2. Espere a bolinha ficar verde (uns 5 minutos).

## Se a execução ficar vermelha

O GitHub manda um e-mail. A cópia daquele mês **não está confirmada**: não confie nela.

1. Abra a execução e veja qual passo ficou com ✗ (por exemplo, **Restaura a cópia** ou **Confere o banco restaurado**).
2. Chame o Claude e diga: "a cópia de segurança ficou vermelha". Ele lê a execução e corrige.
3. Depois da correção, rode uma cópia na hora (acima) e confira que ficou verde.

## Restaurar de verdade

Só se o banco da loja se perder ou estragar. **Faça com o Claude**, com calma, e nunca por cima do banco atual sem ter certeza.

1. **Primeiro, tente o backup do próprio Supabase.** No plano Pro, o Supabase guarda uma cópia do banco por dia, dos últimos 7 dias (**Database** → **Backups**). Se o problema for recente, restaurar por ali é o mais simples. Esse backup **não traz** as fotos nem os XMLs (que não foram afetados se o problema foi só no banco).
2. Se não der, use a cópia do GitHub:
   1. crie um projeto Supabase novo, em São Paulo;
   2. o Claude roda os três arquivos no banco novo, nesta ordem: `roles.sql`, `schema.sql` e `data.sql` (com a opção que desliga os gatilhos durante a carga, como manda a documentação do Supabase);
   3. o Claude sobe as pastas `arquivos/fotos-produtos` e `arquivos/notas-xml` para os depósitos de mesmo nome do projeto novo;
   4. troque as 3 variáveis de **Production** na Vercel para as chaves do projeto novo e publique de novo (veja a [configuração dos ambientes](configuracao-dos-ambientes.md));
   5. entre no sistema e confira alguns produtos, saldos e notas.

A senha do banco e as chaves do projeto novo são digitadas **só nos painéis** do Supabase, da Vercel e do GitHub, nunca no chat.

## Trocar a origem para a produção

Quando o banco de produção for criado, peça ao Claude: "troque a cópia de segurança para a produção". Ele muda, no arquivo `.github/workflows/copia-de-seguranca.yml`, os segredos de `SUPABASE_ACCESS_TOKEN` e `SUPABASE_REF_TESTE` para `SUPABASE_ACCESS_TOKEN_PRODUCAO` e `SUPABASE_REF_PRODUCAO` (os mesmos do botão "Aplicar banco na produção"), e roda uma cópia na hora para conferir.

## O que a cópia não cobre

- As configurações dos painéis (Vercel, Supabase, GitHub): estão descritas na [configuração dos ambientes](configuracao-dos-ambientes.md).
- O código do sistema: já está guardado no GitHub, com todo o histórico.
