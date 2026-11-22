# Cópia de segurança mensal, automática, com restauração testada

- **Data:** 2026-11-22
- **Situação:** aprovada em 2026-11-22
- **Parte de:** fechar a fase 1 — critério 5 ("um backup da produção foi restaurado com sucesso num banco separado") e o item do manual "baixar uma cópia de segurança (todo mês) e restaurar um backup" da [especificação da fase 1](2026-10-21-fase-1-base-design.md).

## Por quê

Se o Supabase perder os dados, se a conta for bloqueada ou se alguém apagar algo por engano, a loja precisa de uma cópia **fora do Supabase** e precisa saber que ela **volta inteira**. O backup diário do plano Pro (7 dias) ajuda, mas fica dentro do próprio Supabase e **não inclui as fotos dos produtos nem os XMLs das notas** (eles ficam no Storage, fora do banco).

## Decisões do usuário

- A cópia é **automática** e fica **guardada no GitHub** (área privada do repositório, junto das execuções do GitHub Actions).

## O que muda

1. **Rotina no GitHub Actions** (`.github/workflows/copia-de-seguranca.yml`):
   - roda **todo dia 1, às 03:00 de São Paulo**, e também por um botão (**Run workflow**) para fazer uma cópia na hora;
   - **exporta o banco inteiro** (papéis, estrutura e dados) com o Supabase CLI;
   - **baixa os arquivos** dos depósitos `fotos-produtos` e `notas-xml`;
   - **restaura a cópia num banco Supabase vazio**, criado na própria máquina do GitHub, e **confere as contagens** de tabelas principais (usuários, produtos, variações, lotes, saldos, movimentações, notas, inventários) contra o banco de origem, e o número de arquivos baixados contra o Storage;
   - guarda tudo como **um pacote** (`copia-AAAA-MM-DD`) nas execuções do GitHub, por **90 dias** (sempre há as 3 últimas mensais);
   - se qualquer passo falhar, a execução fica vermelha e o GitHub avisa por e-mail.
2. **Banco de origem:** por enquanto, o **banco de teste** (prova que a rotina funciona sem custo). Quando o banco de produção existir, a rotina passa a copiar a **produção** — trocar é mudar um valor no arquivo, e o manual diz como.
3. **Manual novo** `docs/manual/copia-de-seguranca.md`: o que a rotina faz; onde achar e baixar a cópia; como fazer uma na hora; o que fazer se ficar vermelha; como **restaurar de verdade** num projeto Supabase novo (passo a passo); e o backup diário do Supabase Pro.
4. **README:** link para o manual novo.

## Caminhos considerados

- **No GitHub, automática (escolhido pelo usuário):** simples, fora do Supabase, sem conta nova. Os dados reais ficam na área privada do repositório.
- **No Google Drive da loja:** a loja controla o lugar e o prazo, mas exige ligar o GitHub ao Google com uma permissão nova.
- **À mão, num pendrive:** não depende de serviço, mas depende de alguém lembrar todo mês (e o computador da loja não tem Docker para exportar o banco).

## Minhas escolhas (o usuário pode corrigir)

- **Mensal**, como a especificação pede; o botão cobre a cópia "na hora" antes de algo arriscado (ex.: importar uma planilha grande).
- **Sem senha no pacote:** o repositório é privado e só quem tem acesso a ele vê as cópias. Pôr senha exigiria guardar e lembrar a senha à parte.

## Fora desta etapa

- Copiar para outro lugar além do GitHub.
- Restaurar automaticamente em produção (restauração real é sempre manual, com o manual).

## Regras

- Nenhuma senha ou chave no repositório: a rotina usa os segredos que o GitHub já tem (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_REF_TESTE`; para a produção, `SUPABASE_ACCESS_TOKEN_PRODUCAO`, `SUPABASE_REF_PRODUCAO`). Se precisar de outro segredo, o usuário cria no painel do GitHub, nunca pelo chat.
- A rotina só **lê** o banco de origem; nunca escreve nele.
- O banco de teste continua sem dados reais da loja.

## Como saber que deu certo

- Uma execução pelo botão, no banco de teste, termina verde, com o pacote `copia-AAAA-MM-DD` nas execuções, contendo o banco e os arquivos, e com as contagens da restauração iguais às da origem (aparecem no resumo da execução).
- Uma segunda execução com uma diferença forçada (ex.: conferir uma tabela a mais que não foi restaurada) fica vermelha — prova que a conferência pega erro.
- O manual cobre as tarefas da seção 12 da especificação da fase 1 sobre cópia de segurança.
