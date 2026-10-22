# Configuração dos ambientes (referência)

Passos feitos uma vez, em cada serviço. Senhas e chaves secretas são digitadas **só nos painéis** dos serviços: nunca em conversa, e-mail ou arquivo do projeto.

## Supabase

- **Projeto de teste:** `koptsxaddudfbkmeacpo`.
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

As chaves ficam no Supabase, em **Project Settings** e depois **API Keys**. Depois de mudar variáveis, é preciso publicar de novo (**Deployments**, depois **Redeploy**).

## GitHub

Em **Settings**, depois **Secrets and variables** e depois **Actions**:

| Segredo | Valor |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | token gerado em supabase.com/dashboard/account/tokens |
| `SUPABASE_REF_TESTE` | `koptsxaddudfbkmeacpo` |
| `SUPABASE_REF_PRODUCAO` | ref do projeto de produção |

## Ao instalar um pacote novo (para quem programa)

O npm no Windows às vezes deixa de fora do `package-lock.json` pacotes que o Linux (GitHub e Vercel) exige. Depois de qualquer `npm install <pacote>`, rode `npm run deps:regenerar` antes de enviar.
