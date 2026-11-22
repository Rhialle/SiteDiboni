# Cópia de segurança: registro da execução

Registro gravado durante a execução do [plano](2026-11-22-copia-de-seguranca.md): evidências, decisões tomadas fora do plano (`Ruling:`), a revisão final e o que ficou para depois (`minor (deferred)`).

## Resultado

Rotina **Cópia de segurança** (`.github/workflows/copia-de-seguranca.yml`) no ramo `copia-de-seguranca`, copiando por enquanto o **banco de teste**. Na execução 45056517739:

- exportação do banco sem pedir a senha (o CLI usa o token, como no "Aplicar banco");
- restauração num Supabase vazio na máquina do GitHub, com as mesmas versões da origem;
- **as 64 tabelas voltaram com o mesmo número de linhas** (esquemas `auth`, `public` e `storage`);
- pacote `copia-2026-11-22` (44 KB) guardado até 2027-02-20.

Falha forçada (uma tabela inventada no esperado, execução 45057062504): ficou vermelha no passo **Confere o banco restaurado**, com "public.tabela_que_nao_existe: não restaurada". Desfeita no commit seguinte.

## Evidências

- Task 1: unitários RED local (módulo inexistente) → GREEN 8/8; total 174.
- Task 2: execuções 45055751246, 45056037238, 45056337228 e 45056773812 falharam e levaram às decisões abaixo; 45056517739 verde; 45057062504 vermelha de propósito.

## Decisões tomadas fora do plano

- Ramo nesta pasta, sem worktree. Custo se errado: nenhum.
- **Restaurar como `supabase_admin`:** no Supabase local, o `postgres` não é superusuário e não aplica ajustes que vêm nos papéis da cópia (`log_min_messages`). Custo se errado: nenhum (é o banco descartável da máquina).
- **Mesmas versões da origem:** o login local era mais antigo que o da origem (faltava a coluna `link_token_hash` em `auth.one_time_tokens`). A rotina copia os arquivos de versão que o `supabase link` grava (`supabase/.temp/*-version`) para o Supabase vazio; o `storage-migration` não existe no GitHub e é opcional. Custo se errado: um ciclo a mais.
- **Portas 553xx:** às vezes a máquina do GitHub já tem a porta 54322 ocupada (aconteceu na 45056773812 e no CI da etapa 2 da fluidez). O Supabase vazio sobe nas portas 553xx. Custo se errado: nenhum.
- Uma expressão `sed` saiu com caracteres de controle no meio (o Python converteu `\b` e `\1`) e o GitHub recusou o arquivo (45057004009); corrigida e testada no computador antes de enviar. Custo se errado: nenhum.
- A permissão para enviar a rotina foi bloqueada uma vez pelo sistema de permissões do Claude Code (a rotina copia dados para outro lugar); o usuário liberou.

## O que ainda não foi exercitado

- **Download de arquivos com arquivo de verdade:** os dois depósitos do banco de teste estão vazios (0 fotos, 0 XMLs). A rotina lista, baixa e confere, mas só com zero arquivos. A primeira execução com a produção (que terá fotos) é a primeira prova real dessa parte; conferir o resumo **Conferência dos arquivos** dessa execução.

## Revisão final

(preenchida depois da revisão)
