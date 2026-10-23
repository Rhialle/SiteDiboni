# Como uma mudança chega ao site de verdade

Nenhuma mudança vai direto para o site que a loja usa. O caminho é sempre este:

1. **Ramo de trabalho:** a mudança é feita num ramo separado (ex.: `fase-1-1-fundacao`), nunca direto no `main`.
2. **Testes no GitHub:** a cada envio, o GitHub roda todos os testes. Abra a aba **Actions** do repositório: o resultado precisa ficar **verde**. Se o ramo tiver mudanças no banco, o mesmo processo as aplica no banco de **teste**.
3. **Conferir a pré-visualização:** a Vercel cria um endereço só daquele ramo, usando o banco de teste. Abra, use e confira.
4. **Aplicar o banco na produção:** se houver mudanças no banco, na aba **Actions** escolha **Aplicar banco na produção**, clique em **Run workflow**, escolha o **mesmo ramo** e confirme. Ele roda os testes de novo e só então aplica as mudanças no banco de produção. As mudanças de banco são sempre aditivas, então o site atual continua funcionando.
5. **Juntar no `main`:** só depois dos passos acima. A Vercel publica o `main` automaticamente no endereço de produção.

Regra de ouro: **só juntar no `main` com os testes verdes e a pré-visualização conferida.** O GitHub gratuito não bloqueia isso sozinho em repositório privado, então essa regra depende de quem publica.

## Onde fica cada coisa

| Ambiente | Site | Banco |
|---|---|---|
| Teste | Endereço de pré-visualização de cada ramo, na Vercel | Projeto de teste no Supabase |
| Produção | Endereço principal, na Vercel | Projeto de produção no Supabase |
