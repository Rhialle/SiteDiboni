# Inventário: aviso dos 30 itens e a lista do que falta contar

- **Data:** 2026-11-22
- **Situação:** aprovada em 2026-11-22
- **Parte de:** fechar a fase 1 (critério 4 da [especificação da fase 1](2026-10-21-fase-1-base-design.md): ensaio de contagem de uma prateleira), antes da contagem oficial da loja inteira no começo da fase 2.
- **Origem:** dois pontos deixados para depois no [registro do plano 1.6](../plans/2026-10-29-fase-1-6-inventario-registro.md).

## Por quê

Na contagem pelo celular, a busca mostra no máximo 30 variações e não avisa que existem mais: quem conta a loja inteira pode achar que o item não está no inventário. E a tela diz quantas variações do escopo foram contadas ("12 de 40"), mas não diz **quais** faltam, então não dá para saber que prateleira esqueceram.

## O que muda

1. **Aviso dos 30 itens (tela de contagem):** quando a busca traz 30 variações, aparece embaixo da lista: "Mostrando os 30 primeiros. Para achar outro item, busque pelo nome ou pelo código." A função do banco já para em 30; com exatamente 30 achados o aviso também aparece, e continua verdadeiro. Sem mudança no banco.
2. **Lista do que falta contar:** um bloco que abre e fecha, "Ver as N variações não contadas", com produto, variação e código interno, em ordem de produto e variação. Fechado por padrão, porque na loja inteira a lista pode ter centenas de linhas.
   - **Quem vê:** quem conta (funcionária ou administrador), com a contagem aberta; e o administrador, na revisão. A funcionária com o inventário em revisão continua vendo só "Em revisão pelo administrador.".
   - **"Contada"** é a variação com pelo menos um lote contado neste inventário, a mesma regra do número "variações do escopo contadas" que a tela já mostra.
   - A lista **não mostra saldo**: a contagem continua às cegas.
   - Com tudo contado, o bloco não aparece.
   - Cada linha da lista, na contagem aberta, leva à busca daquele item (o código interno no campo de busca), para contar na hora.
3. **Banco:** função nova `variacoes_nao_contadas(p_inventario)`, para qualquer usuário ativo, que devolve produto, variação, código interno e id das variações do escopo sem contagem. Recusa inventário que não existe. Migração nova e teste de banco (pgTAP).

## Caminhos considerados

- **Só o administrador, na revisão:** mais simples, mas quem conta não sabe o que falta enquanto conta.
- **Os dois veem (escolhido pelo usuário):** ajuda a não esquecer prateleira, sobretudo na contagem da loja inteira.

## Regras que não mudam

- Item não contado não gera ajuste na aprovação (para zerar, é preciso contar 0).
- Nenhum saldo do sistema aparece para quem conta.
- Os textos que os testes de tela já procuram continuam iguais.

## Como saber que deu certo

- Teste de banco da função nova: escopo com 3 variações, 1 contada → devolve as 2 outras, em ordem; inventário inexistente → erro; usuário inativo → erro.
- Testes de tela: o aviso aparece com 30 variações e não aparece com menos; a funcionária vê "Ver as 2 variações não contadas" na contagem e o nome das duas; o administrador vê a lista na revisão; tudo contado → o bloco some.
- CI verde no GitHub (banco, unitários, concorrência e tela).
