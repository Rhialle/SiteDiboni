# Fluidez, etapa 2: menos idas ao banco

- **Data:** 2026-11-22
- **Situação:** aprovada em 2026-11-22
- **Antes:** etapa 1 (resposta imediata ao clique), no main desde 2026-11-20 (c82d266)

## Por quê

Trocar de tela no painel publicado leva de 1,1 a 1,4 s só de servidor (medido em 2026-11-12). O site roda em São Paulo e o banco de teste fica nos EUA: cada ida e volta custa perto de 150 ms, e as telas fazem várias **em fila**, uma esperando a outra. A etapa 3 (banco de produção em São Paulo) resolve a distância, mas só quando a loja for usar de verdade. Esta etapa tira as esperas que não precisam existir, de graça e já com o banco de teste.

## Como é hoje

Toda tela, antes de buscar qualquer dado, faz duas idas seguidas só para saber quem está usando (`src/lib/auth/sessao.ts`):

1. `auth.getUser()` pergunta ao servidor de login se a sessão vale;
2. lê a pessoa na tabela `usuarios` (é aqui que a desativação aparece: o banco não devolve a linha de quem está desativado).

Depois vêm os dados. A maioria das telas faz 1 rodada; as que fazem mais:

| Tela | Rodadas de dados | Total com a sessão |
|---|---|---|
| Ficha do produto (`/produtos/[id]`) | 4 | 6 |
| Inventário (`/inventario/[id]`) | 3 a 4 | 5 a 6 |
| Nota de entrada (`/notas/[id]`) | 2 | 4 |

Descoberta: o projeto de login assina as sessões com chave assimétrica (ES256, conferido em `/auth/v1/.well-known/jwks.json`). Com isso, `auth.getClaims()` confere a sessão no próprio servidor do site, sem ir ao servidor de login. O proxy (`src/lib/supabase/sessao-proxy.ts`) já usa `getClaims()` para renovar a sessão. O nível de duas etapas (`aal`) também vem dentro da sessão.

Nesta versão do Next, o layout e a tela rodam ao mesmo tempo, e a leitura da sessão já é única por requisição (`cache`).

## Caminhos considerados

1. **Só a sessão mais leve:** trocar `getUser()` por `getClaims()`. Tira 1 ida de todas as telas. Um arquivo só.
2. **Sessão mais leve e tudo ao mesmo tempo (escolhido pelo usuário):** o caminho 1 e mais: cada tela busca os dados junto com a leitura da pessoa, em vez de esperar por ela; e as telas com várias rodadas juntam as que dá para juntar. Só código, sem mexer no banco.
3. **O caminho 2 e uma função no banco por tela pesada:** cada tela vira 1 ida. Exige migrações e testes de banco novos, e ganha pouco além do caminho 2.

O usuário escolheu o caminho 2.

## O que muda

1. **Sessão:** `lerSessao` usa `getClaims()` no lugar de `getUser()` e tira o nível de duas etapas da própria sessão, sem outra chamada. A leitura de `usuarios` continua: ela é quem detecta a desativação, na mesma hora.
2. **Dados junto com a sessão:** cada uma das 18 telas do painel dispara as consultas ao mesmo tempo que a leitura da pessoa. O banco já esconde tudo de quem está desativado ou sem papel (RLS), então nada vaza enquanto a sessão é conferida; se a pessoa estiver desativada ou sem sessão, a tela redireciona como hoje e o que chegou é descartado.
3. **Telas com várias rodadas:**
   - **Ficha do produto:** de 4 rodadas para 2. Formas de venda (com faixas) e fotos entram na primeira, buscadas pelo produto; as compatibilidades, já com o nome da outra ponta, ficam na segunda.
   - **Nota de entrada e inventário:** juntar o que não depende de uma resposta anterior; o que depende (por exemplo, a revisão só quando o inventário está em revisão) continua depois.

## Regras que não mudam

- A funcionária não vê nada que hoje não vê, inclusive custo. Onde o que se busca depende do papel (por exemplo, custo só para o administrador), o plano decide tela por tela entre buscar sempre e deixar o banco esconder, ou manter a espera. Nunca mostrar à funcionária o que hoje ela não vê.
- Quem foi desativado deixa de ver os dados na hora e é levado à mensagem de desativado, como hoje.
- Os textos das telas não mudam (os testes de tela os procuram).
- Nenhuma migração e nenhuma mudança no banco.

## Custo aceito

Com `getClaims()`, quando alguém clica em **Sair** num aparelho, a sessão aberta **em outro aparelho** continua valendo até a sessão vencer (até 1 hora). A desativação de um usuário continua valendo na hora, porque o banco a confere em toda consulta.

## Fora desta etapa

- Banco de produção em São Paulo (etapa 3).
- Peso no navegador: vidro, efeitos do mouse (etapa 4, só se a medição mostrar problema).

## Como saber que deu certo

- Os testes de sempre passam no GitHub (banco, unitários, concorrência e tela), incluindo os de entrar, desativar e "funcionária não vê custo".
- Medir no site, como administrador de teste, o tempo de servidor das mesmas telas (Início, Produtos, ficha de um produto, Estoque) **antes**, no site principal, e **depois**, na pré-visualização do ramo. Espera-se perto de 150 a 300 ms a menos por tela, e mais na ficha do produto. Os números entram no registro do plano.

## Deixado para quem constrói

- O jeito exato de disparar as consultas junto com a sessão em cada tela (cuidando que as consultas do Supabase só começam quando alguém espera por elas).
- Se vale um teste novo de tela para o caminho de quem é desativado com a tela já aberta.
