# Plano 1.1 (fundação): registro da execução

Registro gravado durante a execução do [plano 1.1](2026-10-21-fase-1-1-fundacao.md): cada decisão tomada fora do plano (`Ruling:`), com o motivo e o custo se estiver errada; as evidências de teste de cada tarefa; e as melhorias pequenas deixadas para depois (`minor (deferred)`).

Concluído em 2026-10-22: `main` em `077460a`, publicado em https://diboni-psi.vercel.app (usando o banco de teste até existir o de produção).

```text
Spec: docs/superpowers/specs/2026-10-21-fase-1-base-design.md
Setup: Ruling: trabalho num branch `fase-1-1-fundacao` na própria pasta, sem worktree — o painel do app só abre arquivos da pasta da sessão e o usuário não programa — custo se errado: nenhum isolamento extra contra mudanças locais (baixo, há um só autor).
Setup: execução Native escolhida implicitamente: o usuário mandou o link do repositório após a pergunta de aprovação, depois de ter pedido "começa" — custo se errado: o usuário preferia subagentes; tarefas já feitas ficam, troca-se o executor (ledger compartilhado).
Pre-flight:
- T4 consome de T2 criarClienteServidor/criarClienteAdmin e de T3 usuarios/eh_administrador — nomes batem.
- T5 consome de T4 exigirAdministrador/Papel e de T1 reaisParaCentavos/formatarMoeda — nomes batem.
- T4 produz redirect /entrar?motivo=desativado; T5 testa a mensagem de desativado em /entrar — T4 precisa renderizar a mensagem para motivo=desativado (anotado para T4).
- T6 consome scripts db:iniciar/env:local/test/test:e2e de T1/T2/T4 — nomes batem.
Setup: Ruling: títulos '### Tarefa N:' trocados por '### Task N:' no plano — scripts task-start/task-brief só reconhecem 'Task N' — custo se errado: nenhum (só título).
Task 1: Ruling: @vitejs/plugin-react não instalado — conflito de peer (@babel/core 8 vs 7 do shadcn) e os testes unitários do plano são só .ts, sem JSX — custo se errado: instalar quando houver teste de componente.
Task 1: Ruling: @types/node ^20 → ^24 — o vitest 5 exige >=22 e o Node em uso/CI é 24 — custo se errado: nenhum.
Task 1: Ruling: criado .gitattributes com eol=lf — o CI roda em Linux e o Windows trocaria quebras de linha — custo se errado: nenhum.
Task 1: Ruling: vitest.config.ts → vitest.config.mts com resolve.tsconfigPaths nativo, sem vite-tsconfig-paths — elimina os dois avisos do Vite — custo se errado: nenhum.
Task 1: Ruling: título do site 'Diboni' e lang pt-BR — nome tirado do repositório SiteDiboni — custo se errado: trocar um texto.
Task 1: Ruling: repositório do GitHub tinha um commit inicial (README de 2 linhas); juntado com --allow-unrelated-histories mantendo nosso README e o nome 'Di Boni' (corrige o ruling anterior 'Diboni') — sem force push — custo se errado: nenhum.
Task 1: Ruling: autor git local = rhialle <eusourhialle@gmail.com>, igual ao commit inicial do GitHub — Vercel Hobby bloqueia deploy de autor desconhecido em repo privado — custo se errado: trocar user.email.
Task 1: aguardando U3 (verificar pré-visualização 'Entrar'); Task 2 iniciada em paralelo nos passos que não dependem de Docker.
Task 2: Ruling: usuário escolheu NÃO usar Docker local (PC com 7,9 GB de RAM, 0,6 GB livres) — pgTAP e Playwright só no GitHub Actions; ci.yml antecipado para o fim da Task 2; tipos via 'supabase gen types --linked' contra loja-teste; gh CLI para ler o CI; plano atualizado na seção 'Mudança durante a execução' — custo se errado: ciclo de teste de 5–10 min em vez de segundos.
Task 1: verificação U3 — usuário abriu https://diboni-git-fase-1-1-fundacao-rhialles-projects.vercel.app/entrar e viu 'Entrar' (para o executor, a prévia responde 302: proteção de pré-visualização da Vercel).
Task 1: complete (commits 7a0d6f5..873f675, tests: npm test →    Duration  1.14s (import 79%, transform 11%, tests 5%, worker 5%))
Task 2: Ruling: o único projeto Supabase (koptsxaddudfbkmeacpo, org 'Site Diboni') vira o banco de TESTE; o de produção é criado na Task 6 antes do merge no main — custo se errado: renomear/reapontar variáveis.
Task 2: complete (commits 873f675..240eb7a, tests: npm test →    Duration  1.25s (import 76%, transform 14%, worker 5%, tests 5%))
Task 2: Ruling: package-lock regenerado do zero (npm ci no Linux exigia @emnapi/core e @emnapi/runtime ausentes no lock gerado no Windows) — custo se errado: versões ^ subiram para a última compatível.
Task 2: Ruling: typecheck = 'next typegen && tsc --noEmit' — no CI o tsc rodava sem .next e não achava LayoutProps — custo se errado: nenhum.
Task 3: Ruling: tipos do banco gerados no CI a partir das migrações (db:tipos volta a --local); CI falha se tipos.ts estiver desatualizado e publica o artefato tipos-do-banco, que o executor baixa com gh run download — custo se errado: um ciclo de CI a mais quando o schema muda.
Task 3: evidência CI — run 39702468320 RED (relation "usuarios"/"configuracoes" does not exist, 23 falhas) → run 39702912355 'Files=3, Tests=23, Result: PASS' → run 39703364447 todo verde (inclui tipos do banco).
Task 3: complete (commits 240eb7a..1543a55, tests: npm test →    Duration  770ms (import 78%, transform 12%, worker 5%, tests 4%))
Task 4: Ruling: criado 'npm run deps:regenerar' (refaz package-lock do zero) — npm no Windows perde @emnapi/* do lock a cada instalação incremental e o npm ci do Linux falha; usar sempre após instalar pacotes — custo se errado: versões ^ sobem a cada regeneração.
Task 4: Ruling: mantido cacheComponents/partialPrefetching (serão padrão no Next 17) e marcadas com 'export const instant = false' as rotas que leem sessão/URL — painel interno não precisa de static shell — custo se errado: navegação espera o servidor; adotar Suspense/'use cache: private' depois.
Task 4: Ruling: usuário inativo vai para /sair?motivo=desativado (route handler apaga a sessão e redireciona para /entrar?motivo=desativado), em vez de direto para /entrar — Server Component não grava cookies — custo se errado: nenhum (URL final igual à do plano).
Task 4: Ruling: textos extras não previstos no plano: 'A nova senha precisa ser diferente da atual.' (same_password) e 'Não foi possível salvar a senha. Tente de novo.' (demais erros) — custo se errado: trocar texto.
Task 4: Ruling: componentes shadcn input/label/card adicionados (base-nova); tela-de-acesso.tsx compartilhada pelas telas de login — custo se errado: nenhum.
Task 4: Ruling: ids de campos via useId() em todos os formulários — com Cache Components a rota anterior fica oculta (Activity) e ids fixos colidiam, deixando o e-mail de 'Esqueci minha senha' vazio — custo se errado: nenhum.
Task 4: Ruling: testes de tela localizam campos com getByLabel(..., exact).filter({ visible: true }) — a rota anterior oculta também tem campos com o mesmo rótulo — custo se errado: nenhum.
Task 4: Ruling: criarClienteServidor chama await connection() antes de cookies() — supabase-js chama Date.now() ao iniciar e o Next acusava 'unstable value Date.now() while prerendering' — custo se errado: nenhum.
Task 4: Ruling: teste de recuperação espera o texto da tela 'Esqueci minha senha' antes de preencher — corrida do Playwright com a troca de tela do Next (o campo da tela anterior ainda visível no instante da busca) — custo se errado: nenhum (só teste).
Task 4: evidência CI — run 39704767526 RED (8 falhas: campos/páginas inexistentes) → run 39707336418 '8 passed', CI todo verde.
Task 4: complete (commits 1543a55..aa5a5fc, tests: npm test →    Duration  878ms (import 75%, transform 13%, worker 6%, tests 5%))
Task 5: Ruling: textos novos fora da tabela do plano: 'Informe o nome.', 'Não foi possível enviar o convite. Tente de novo.', 'Não foi possível concluir. Tente de novo.', 'Informe o limite em reais, por exemplo 50,00.', 'Informe os dias como números inteiros maiores que zero, separados por vírgula.', 'Configurações salvas.' — custo se errado: trocar texto.
Task 5: Ruling: mensagens movidas de src/lib/auth/mensagens.ts para src/lib/mensagens.ts (deixaram de ser só de login) — custo se errado: nenhum.
Task 5: Ruling: formulários devolvem os valores digitados no estado de erro (React 19 limpa o form após a ação) — custo se errado: nenhum.
Task 5: Ruling: formatarReais(centavos) criado (com teste) para o campo do limite — custo se errado: nenhum.
Task 5: evidência CI — run 39707929372 RED (9 falhas, 8 antigos passando) → run 39708808564 '17 passed', CI verde.
Task 5: complete (commits aa5a5fc..f442c2d, tests: npm test →              at least ~437ms faster with isolate: false — reuses workers across files instead of one per file)
Task 6: Ruling: configuração de login do projeto de teste aplicada por 'supabase config push' com bloco [remotes.teste] (cadastro aberto desligado, senha mínima 8, endereços permitidos, site_url diboni-rhialles-projects.vercel.app); verificado: diff 0 e signup via API → 422 — modelos de e-mail recusados no plano free sem SMTP próprio, ficam para quando o Resend for configurado — custo se errado: rodar config push de novo.
Task 6: Ruling: banco-teste roda no ci.yml após os testes, só em push fora do main, e só avisa (warning) se os segredos ainda não existirem; banco-producao.yml é workflow_dispatch que reutiliza ci.yml via workflow_call antes do db push — custo se errado: nenhum.
Task 6: Ruling: CI usa só SUPABASE_ACCESS_TOKEN + ref (sem senha do banco) — 'supabase link/db push' cria papel de login temporário pelo token (verificado localmente: migração aplicada no loja-teste sem senha) — custo se errado: adicionar o segredo da senha.
Task 6: Ruling: manual ganhou um 4º arquivo, configuracao-dos-ambientes.md (Vercel, Supabase, GitHub), além dos 3 do plano — custo se errado: nenhum.
Final review: self-review (o harness só permite subagente quando o usuário pede) — achado Important: administrador com duas etapas pode não conseguir trocar a senha pela recuperação (Supabase pode exigir aal2 e a tela só mostraria erro genérico).
Final: fixed admin com duas etapas não conseguia trocar a senha pela recuperação — teste 'administrador com duas etapas recupera a senha' RED (run 39709882818: caiu em /redefinir-senha) → GREEN (run 39710618069), suite 18/18 tela + 30/30 unitários + 23/23 banco.
Task 6: verificação — run 39713927729: banco-teste 'Finished supabase link. Remote database is up to date.' com os segredos do usuário; Vercel status 'success — Deployment has completed' no commit 5ad3d44 (prévia com variáveis de teste).
Final: minor (deferred): actions/upload-artifact@v4 usa Node 20 (aviso de descontinuação do GitHub); trocar por v5.
Final: minor (deferred): quem já está logado e abre / ou /entrar vê o formulário de login em vez de ir para o Início.
Final: minor (deferred): desativar a si mesmo (havendo outro administrador) não pede confirmação e corta o acesso na hora.
Task 6: Ruling: banco-producao usa segredo próprio SUPABASE_ACCESS_TOKEN_PRODUCAO — o token atual tem acesso só ao projeto de teste (menor privilégio por ambiente) — custo se errado: um segredo a mais.
Task 6: Ruling (aprovado pelo usuário): produção do Supabase adiada até a loja usar o sistema de verdade (sem vaga gratuita; não pagar Pro antes de haver dados reais); site principal diboni-psi.vercel.app aponta para o banco de teste; [remotes.teste] aceita o domínio principal (config push, diff 0) — custo se errado: dado real cadastrado no banco de teste antes da troca.
Task 6: verificação — main 077460a publicado pela Vercel (success); https://diboni-psi.vercel.app/entrar → 200 'Di Boni'; /inicio sem login → payload NEXT_REDIRECT para /entrar, sem conteúdo do painel.
Final: minor (deferred): sem login, /inicio responde HTTP 200 com redirecionamento no payload (streaming do Cache Components) em vez de 307 do servidor; o navegador redireciona e nada protegido é enviado.
Task 6: complete (commits f442c2d..760b43b, tests: npm test →              at least ~777ms faster with isolate: false — reuses workers across files instead of one per file)
```
