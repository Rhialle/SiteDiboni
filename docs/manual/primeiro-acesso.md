# Primeiro acesso do administrador

O sistema não tem cadastro aberto: ninguém cria conta sozinho. O **primeiro usuário** de cada banco (teste e produção) é criado por você no painel do Supabase e vira **administrador** automaticamente. Os demais entram por convite, pela tela **Usuários**.

## 1. Criar o seu usuário no Supabase

Faça isto **depois** que as tabelas do sistema estiverem no banco: no de teste já estão; no de produção, depois de rodar "Aplicar banco na produção" (veja [publicar-mudancas.md](publicar-mudancas.md)).

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard) e abra o projeto.
2. Vá em **Authentication**, depois **Users**, e clique em **Add user** e depois em **Create new user**.
3. Informe o seu e-mail e uma senha com pelo menos 8 caracteres.
4. Deixe marcada a opção **Auto Confirm User**.
5. Clique em **Create user**.

## 2. Entrar e cadastrar a verificação em duas etapas

1. Abra o endereço do sistema e entre com o e-mail e a senha.
2. Como você é administrador, o sistema pede a **verificação em duas etapas**. Instale no celular um aplicativo autenticador, como **Google Authenticator** ou **Microsoft Authenticator**.
3. No aplicativo, toque em adicionar e leia o **QR code** que aparece na tela. Se a câmera não funcionar, digite o código que aparece embaixo do QR code.
4. Digite no sistema o código de 6 dígitos que o aplicativo mostra e clique em **Confirmar**.

Daqui para a frente, sempre que entrar, o sistema pede a senha e depois o código do aplicativo.

## Se perder o celular

Sem o aplicativo não dá para entrar como administrador. Para cadastrar um celular novo:

1. No painel do Supabase, abra **Authentication** e depois **Users**, e clique no seu usuário.
2. Na parte de **MFA factors**, apague o fator cadastrado.
3. Entre no sistema de novo: ele vai pedir para cadastrar a verificação em duas etapas, como na primeira vez.

Se houver outro administrador na loja, ele também pode fazer esse passo por você.
