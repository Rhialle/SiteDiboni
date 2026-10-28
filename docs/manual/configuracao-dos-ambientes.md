# Configuração dos ambientes (referência)

Passos feitos uma vez, em cada serviço. Senhas e chaves secretas são digitadas **só nos painéis** dos serviços: nunca em conversa, e-mail ou arquivo do projeto.

## Supabase

- **Projeto de teste:** `koptsxaddudfbkmeacpo` (por enquanto atende também o site principal, https://diboni-psi.vercel.app).
- **Projeto de produção:** criado numa organização separada, região South America (São Paulo).
- **Login:** a configuração de login de cada projeto (cadastro aberto desligado, senha mínima de 8, endereços permitidos) está em `supabase/config.toml`, nos blocos `[remotes.*]`, e é aplicada com:

  ```bash
  npx supabase config diff --project-ref <ref-do-projeto>
  npx supabase config push --project-ref <ref-do-projeto>
  ```

  Sempre rode o `diff` antes e confira as mudanças.
- **Modelos de e-mail** (convite e nova senha, em `supabase/templates/`): o plano gratuito só aceita depois de configurar um SMTP próprio (Resend, com o domínio da loja).

## Vercel

Em **Settings** e depois **Environment Variables**:

| Variável | Preview e Development | Production |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto de teste | URL do projeto de produção |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável do teste | chave publicável da produção |
| `SUPABASE_SECRET_KEY` | chave secreta do teste | chave secreta da produção |

**Por enquanto, Production usa os mesmos valores do teste**, até existir o banco de produção. Quando ele for criado:

1. desligue o modo de teste (abaixo);
2. aplique o banco nele ("Aplicar banco na produção");
3. crie o seu usuário nele;
4. troque as 3 variáveis de Production para os valores dele e publique de novo.

As chaves ficam no Supabase, em **Project Settings** e depois **API Keys**. Depois de mudar variáveis, é preciso publicar de novo (**Deployments**, depois **Redeploy**).

### Modo de teste (entrada sem senha)

Com a variável `ENTRADA_DE_TESTE` valendo `1`:

- a tela **Entrar** ganha os botões **Administrador de teste** e **Funcionária de teste**, que entram sem senha e sem código, em contas de teste (`admin.teste@diboni.test` e `funcionaria.teste@diboni.test`);
- o painel mostra uma faixa avisando que o modo está ligado.

Qualquer pessoa que souber o endereço entra como administrador. Por isso:

- com o modo ligado, **não cadastre dados reais da loja** (nem notas fiscais reais);
- **desligue antes de a loja usar de verdade**: apague a variável (ou troque para `0`) em Production e Preview e publique de novo (**Redeploy**). Os botões somem;
- **nunca** ligue o modo depois que Production estiver apontando para o banco de produção.

Para ligar: em **Environment Variables**, crie `ENTRADA_DE_TESTE` com o valor `1`, marque **Production** e **Preview**, salve e publique de novo.

## GitHub

Em **Settings**, depois **Secrets and variables** e depois **Actions**:

| Segredo | Valor |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | token com acesso **só ao projeto de teste** (supabase.com/dashboard/account/tokens) |
| `SUPABASE_REF_TESTE` | `koptsxaddudfbkmeacpo` |
| `SUPABASE_ACCESS_TOKEN_PRODUCAO` | outro token, com acesso **só ao projeto de produção** |
| `SUPABASE_REF_PRODUCAO` | ref do projeto de produção |

Os tokens vencem (ex.: 90 dias). Antes do vencimento, gere um novo no Supabase e substitua o segredo no GitHub; se vencer, o CI avisa que não conseguiu aplicar o banco.

## Ao instalar um pacote novo (para quem programa)

O npm no Windows às vezes deixa de fora do `package-lock.json` pacotes que o Linux (GitHub e Vercel) exige. Depois de qualquer `npm install <pacote>`, rode `npm run deps:regenerar` antes de enviar.
