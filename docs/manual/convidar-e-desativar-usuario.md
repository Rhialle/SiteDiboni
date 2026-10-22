# Convidar, mudar o papel e desativar usuários

Tudo isso fica na tela **Usuários**, que só aparece para administradores.

## Papéis

- **Administrador:** faz tudo, inclusive mudar preços, ver custos, aprovar ajustes e cuidar dos usuários. Entra sempre com a verificação em duas etapas.
- **Funcionário:** consulta produtos e estoque, dá entrada de notas e conta inventário. Não vê custos nem muda preços.

## Convidar alguém

1. Em **Usuários**, preencha **Nome**, **E-mail** e **Papel**.
2. Clique em **Convidar**. Aparece "Convite enviado para …".
3. A pessoa recebe um e-mail com o link **Criar minha senha**, cria a senha e já entra no sistema.

> **Atenção:** enquanto o envio de e-mails próprio (Resend, com o domínio da loja) não estiver configurado, o Supabase só entrega e-mails para quem faz parte da equipe do projeto no Supabase. Convites para outros e-mails não chegam até lá.

Se o e-mail já tiver conta, aparece "Já existe um usuário com este e-mail.".

## Mudar o papel

Na linha da pessoa, clique em **Tornar administrador** ou **Tornar funcionário**.

## Desativar e reativar

- **Desativar:** a pessoa não consegue mais entrar. Se estiver com o sistema aberto, é desconectada na próxima página que abrir. Nada do que ela fez é apagado.
- **Reativar:** devolve o acesso com a mesma senha de antes.

O sistema sempre exige **pelo menos um administrador ativo**. Se você tentar desativar ou rebaixar o único administrador, aparece "Precisa existir pelo menos um administrador ativo." e nada muda.
