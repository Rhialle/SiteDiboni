---
name: Di Boni
description: Painel da loja Di Boni, com jeito de jogo, vidro fosco e as cores da marca.
colors:
  uva: "#5b1f8e"
  magenta: "#a62c93"
  magenta-clara: "#c13fa6"
  ameixa: "#6e1a63"
  tinta: "#111a53"
  tinta-suave: "#4a5180"
  lilas: "#f1eaf9"
  nevoa: "#f6f3fc"
  borda-campo: "#d9d3e8"
  sol: "#ffc83d"
  coral: "#f2545b"
  azul: "#4a8bef"
  menta: "#1db37a"
  perigo: "#c93139"
typography:
  display:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  numero:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  selo:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  icone: "14px"
  campo: "14px"
  tabela: "22px"
  carta: "26px"
  painel: "1.925rem"
  pilula: "999px"
spacing:
  campo-x: "14px"
  carta: "20px"
  painel: "24px"
  grade: "16px"
  secao: "32px"
  tela-x: "40px"
  tela-x-celular: "16px"
components:
  button-primary:
    backgroundColor: "{colors.magenta}"
    textColor: "#ffffff"
    rounded: "{rounded.pilula}"
    height: "44px"
    padding: "0 20px"
  button-claro:
    backgroundColor: "#ffffff"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pilula}"
    height: "44px"
    padding: "0 20px"
  button-perigo:
    backgroundColor: "{colors.perigo}"
    textColor: "#ffffff"
    rounded: "{rounded.pilula}"
    height: "44px"
    padding: "0 20px"
  campo:
    backgroundColor: "#ffffff"
    textColor: "{colors.tinta}"
    rounded: "{rounded.campo}"
    height: "44px"
    padding: "0 14px"
  selo-repor:
    backgroundColor: "#e6efff"
    textColor: "#1f4fae"
    typography: "{typography.selo}"
    rounded: "{rounded.pilula}"
  carta-de-aviso:
    backgroundColor: "#ffffff"
    textColor: "{colors.tinta}"
    rounded: "{rounded.carta}"
    padding: "20px"
  menu-lateral:
    backgroundColor: "{colors.uva}"
    textColor: "#ffffff"
    width: "248px"
---

# Design System: Di Boni

## Overview

**Creative North Star: "Confete com ordem"**

O painel é a ferramenta de trabalho de uma loja de festas e confeitaria: a festa aparece no visual, o rigor fica no estoque. Cor, brilho e movimento ocupam o menu, os avisos e os momentos de conquista; tabelas e formulários ficam limpos, alinhados e fáceis de ler para uma equipe com familiaridade mista com tecnologia, no computador do balcão e no celular do depósito.

A identidade vem do logo da Di Boni: o "d" em degradê roxo-magenta e o "b" azul-marinho, as letras de balão e o círculo listrado. Daí saem o violeta do menu, o magenta das ações e a tinta azul-marinho do texto. Por cima, uma camada de vidro fosco no estilo da Apple deixa o fundo de confete em 3D aparecer desfocado, e as peças se comportam como botões de videogame: têm brilho, base e afundam no clique.

A ambição é jogo com acabamento caprichado: contornos finos em vez de traço grosso de desenho animado, sombras suaves com cor e resposta a cada gesto. Tudo se mexe quando a pessoa age (faísca no clique, brilho no botão, carta que inclina, tela que entra), e o confete grande fica guardado para as conquistas.

**Key Characteristics:**
- Vidro fosco sobre um fundo de confete 3D nas cores da loja.
- Menu violeta de vidro com a pílula branca que desliza até a página aberta.
- Botões de jogo em pílula, com base que afunda no clique.
- Cores de festa que sempre dizem alguma coisa: vencido, vencendo, repor, tudo certo.
- Uma família tipográfica só (Rubik), dos números grandes ao texto das tabelas.
- O balão da Di Boni comemora quando está tudo em dia, e solta confete de novo quando alguém clica nele.
- Tudo responde: faísca colorida em cada clique, brilho que atravessa o botão, mola ao soltar, telas e linhas de tabela que entram em sequência.

## Colors

Violeta e magenta da marca são donos de áreas inteiras; quatro cores de festa só aparecem com significado.

### Primary
- **Magenta da marca** (`magenta`): botão principal, links em foco, anel de foco dos campos e destaques. O degradê do botão vai do **magenta claro** (`magenta-clara`) ao magenta, com a base em **ameixa** (`ameixa`).

### Secondary
- **Uva** (`uva`): o vidro do menu lateral, a barra do topo no celular e o fundo das telas de acesso, sempre em degradê de uva até ameixa-magenta.

### Tertiary
- **Coral** (`coral`): vencido, erro, problema agora. É a única cor que pulsa.
- **Sol** (`sol`): vencendo, atenção, o aviso do modo de teste e o avatar.
- **Azul** (`azul`): repor estoque, abaixo do mínimo.
- **Menta** (`menta`): tudo certo, salvo, ativo.

### Neutral
- **Tinta** (`tinta`): todo o texto e os ícones sobre fundo claro. Nunca preto.
- **Tinta suave** (`tinta-suave`): texto de apoio, cabeçalhos de tabela, legendas.
- **Névoa** (`nevoa`): fundo da página, em degradê de lilás, céu e rosado atrás do vidro.
- **Lilás** (`lilas`): cabeçalho das tabelas, fundo de itens selecionados.
- **Borda do campo** (`borda-campo`): contorno dos campos em repouso.
- **Perigo** (`perigo`): botão de ação destrutiva (estornar, desativar).

### Named Rules
**The Uma Cor, Um Recado Rule.** Coral, sol, azul e menta nunca são enfeite fora do confete. A carta, o selo e o ícone de um mesmo assunto usam a mesma cor: "abaixo do mínimo" é azul em todo lugar.

**The Sem Preto Rule.** Texto e contorno usam tinta azul-marinho; preto puro não aparece.

## Typography

**Display Font:** Rubik (com system-ui)
**Body Font:** Rubik (com system-ui)

**Character:** Uma família só, de cantos levemente arredondados, que conversa com as letras de balão do logo sem ficar infantil. A hierarquia vem de peso e tamanho, nunca de cor ou itálico.

### Hierarchy
- **Display** (700, 2.5rem no computador e 1.875rem no celular, 1.05): título de cada tela.
- **Número** (800, 3.75rem no computador e 3rem no celular, 1, números de largura fixa): a contagem das cartas de aviso.
- **Headline** (600, 1.25rem): título de seção dentro da tela.
- **Body** (400, 1rem, 1.5): texto corrido e campos. Nada menor que 14px no corpo.
- **Label** (500, 0.875rem): rótulos de campo, itens de tabela, botões.
- **Selo** (500, 0.8125rem): selos de situação.

### Named Rules
**The Número Que Conta Rule.** Quantidades em tabelas e cartas usam números de largura fixa (tabular), para as colunas alinharem.

**The Frase Completa Rule.** Rótulos e botões dizem a ação por extenso ("Ver alertas", "Salvar produto"); ícone sozinho não substitui palavra.

## Layout

No computador, um menu lateral fixo de 248px e o conteúdo com até 72rem de largura, 40px de margem lateral e 40px no topo. No celular, abaixo de 768px, o menu some: entra uma barra violeta fina no topo, com a marca, e uma barra de vidro flutuante embaixo, com quatro itens e "Mais". O conteúdo ganha 16px de margem e espaço extra embaixo para a barra não cobrir nada.

O ritmo é de 32px entre seções, 16px entre cartas e 12 a 16px dentro dos grupos de campos. As cartas de aviso ficam em duas colunas no celular e quatro no computador. Painéis de formulário ocupam a largura do conteúdo; o de Configurações fica limitado a 36rem.

## Elevation & Depth

A profundidade vem do vidro: superfícies translúcidas com desfoque e saturação sobre o fundo de confete, com uma linha de brilho branca em cima e uma sombra suave e longa tingida de tinta. Uma luz branca segue o cursor dentro de cada vidro. Os botões têm uma segunda camada de profundidade, a base vertical que afunda no clique. O fundo de confete acompanha o mouse em camadas (as formas maiores andam mais) e só flutua sozinho no Início e nas telas de acesso.

### Shadow Vocabulary
- **Vidro** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / .9), 0 1px 2px rgb(17 26 83 / .06), 0 18px 40px -16px rgb(17 26 83 / .28)`): painéis, cartas, tabelas, barra do celular.
- **Base do botão** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / .35), 0 4px 0 #6e1a63, 0 12px 20px -10px rgb(166 44 147 / .5)`): botão principal; some ao clicar e o botão desce 4px.
- **Confete** (`filter: drop-shadow(0 14px 18px rgb(17 26 83 / .18))`): formas 3D do fundo.

### Named Rules
**The Vidro Não Empilha Rule.** Vidro dentro de vidro perde o desfoque: uma tabela dentro de um painel vira branco translúcido, sem sombra própria.

**The Tudo Responde Rule.** Todo gesto tem resposta: faísca no clique, brilho no hover, mola ao soltar, tela que entra subindo e entrando em foco, linhas da tabela que chegam em sequência. O confete grande fica para as conquistas (tudo em dia, salvo).

**The Alvo Parado Rule.** O que se clica nunca fica se mexendo sozinho para sempre; movimento contínuo só em enfeite (balão, confete do fundo, ponto do selo crítico).

## Shapes

Formas cheias e arredondadas, sem cantos vivos. Botões, selos, abas e o menu são pílulas completas. Campos e ícones têm cantos de 14px; tabelas, 22px; cartas, 26px; painéis, cerca de 31px. O confete do fundo usa a mesma geometria do logo e das referências de festa: esferas, pílulas, triângulos de pontas arredondadas, brilhos de quatro pontas e anéis, todos com degradê e um reflexo branco.

## Components

### Buttons
Peças de jogo: brilham, têm base e afundam.
- **Shape:** pílula completa (999px), 44px de altura (36px no tamanho pequeno).
- **Primary:** degradê de magenta claro para magenta, texto branco em semibold, base ameixa de 4px.
- **Hover / Focus:** sobe 1px, clareia e um brilho atravessa o botão; foco com anel magenta translúcido de 4px. No clique, desce 4px, achata um pouco, a base some e saem faíscas coloridas do ponto do clique; ao soltar, volta com mola.
- **Claro (outline e secondary):** degradê branco para lilás bem claro, texto tinta, contorno interno fino e base cinza-azulada.
- **Perigo:** degradê vermelho com base vinho, para estornar e desativar.
- **Ghost e link:** sem base; o link é sublinhado em tinta e fica magenta no hover.

### Chips
- **Selo:** pílula com borda fina, fundo tingido e um ponto da cor do texto. Tons: crítico (coral, pulsa), atenção (sol), repor (azul), ok (menta), marca (magenta, para pendente) e neutro.
- **Link em pílula:** abas e atalhos ("Movimentações", "Solicitações", "Ver extrato", paginação) em vidro branco com sombra curta; sobem 1px no hover.

### Cards / Containers
- **Corner Style:** 26px nas cartas de aviso; cerca de 31px nos painéis de formulário.
- **Background:** vidro branco a 64% com desfoque de 22px.
- **Shadow Strategy:** sombra de vidro (ver Elevation & Depth).
- **Border:** 1px branco translúcido.
- **Internal Padding:** 20px nas cartas, 20 a 24px nos painéis.

### Inputs / Fields
- **Style:** fundo branco a 90%, contorno de 1.5px em borda-campo, cantos de 14px, 44px de altura, texto de 16px. Seletores com a mesma medida e uma seta desenhada em tinta suave.
- **Focus:** contorno magenta e halo magenta de 4px a 15%; cursor de texto magenta.
- **Error / Disabled:** erro com contorno vermelho e caixa de mensagem rosada; desabilitado com fundo lilás e opacidade reduzida.

### Navigation
- **Computador:** coluna de vidro uva, 248px, fixa. Marca no topo (monograma num selo branco e "Di Boni" em extrabold). Itens com ícone e nome em branco a 80%; o item aberto ganha a pílula branca, que desliza com mola até ele. Itens de administrador ficam depois de um divisor fino. Embaixo, avatar sol com a inicial, nome, papel e "Sair".
- **Celular:** barra de vidro flutuante a 12px das bordas, cantos de 30px, cinco itens com ícone e nome. O item aberto fica magenta sobre uma pílula magenta translúcida. "Mais" abre um painel de vidro com os itens restantes e o "Sair".

### Carta de aviso
O momento de festa do Início. A carta inteira é o link e inclina em 3D na direção do cursor, com o ícone dando um pulinho; dentro, um ícone de jogo na cor do assunto, o número grande que conta de 0 até o valor (e pula ao chegar) e a frase do aviso. No computador, um botão claro desenhado embaixo ("Ver alertas"). As cartas entram uma a uma com mola. Sem avisos, aparece "Tudo em dia!" com o balão flutuando e uma chuva de confete, uma vez por sessão do navegador; clicar no balão faz chover de novo.

### Aviso de salvo
Pílula escura de vidro (tinta a 85%) com um círculo menta e o ✓ que se desenha. Estoura com mola logo abaixo do formulário, solta uma chuvinha de confete e mantém a frase da ação ("Alterações salvas."). O aviso de erro treme ao aparecer, com um ícone de alerta.

## Do's and Don'ts

### Do:
- **Do** colocar conteúdo de trabalho em vidro claro (painel, tabela ou carta) sobre o fundo de festa.
- **Do** usar a mesma cor para o mesmo assunto na carta, no selo e no ícone.
- **Do** manter 44px de altura em botões e campos, para tocar fácil no celular.
- **Do** respeitar quem pede menos movimento: sem animação, o ✓ já aparece desenhado e os números já mostram o valor.
- **Do** usar o monograma "db" num selo branco sempre que ele ficar sobre o violeta.

### Don't:
- **Don't** pôr vidro dentro de vidro com sombra própria.
- **Don't** deixar algo clicável em movimento contínuo; o clique precisa de um alvo parado.
- **Don't** gastar o confete grande fora das conquistas; no dia a dia, a resposta é faísca, brilho e mola.
- **Don't** usar coral, sol, azul ou menta como decoração fora do confete.
- **Don't** usar preto puro ou cinza neutro no texto; use tinta e tinta suave.
- **Don't** trocar um rótulo escrito por um ícone sozinho.
