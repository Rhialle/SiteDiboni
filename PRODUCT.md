# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Administrador:** quem administra a loja. Cadastra produtos, confere o estoque, aprova solicitações, importa notas, convida usuários e mexe nas configurações. Entra com senha e duas etapas.
- **Funcionária:** atende no balcão e cuida da prateleira e do depósito. Consulta saldo e validade, registra entrada de mercadoria e pede perdas e ajustes, que o administrador aprova.
- A equipe tem familiaridade **mista** com tecnologia: algumas pessoas se viram bem, outras têm dificuldade. O painel atende quem tem mais dificuldade sem ficar lento para quem tem prática.
- O painel é usado **no computador e no celular por igual**: cadastro e notas no computador da loja; consulta de estoque e contagem andando pela loja e pelo depósito, no celular.

## Product Purpose

Sistema próprio da loja Di Boni, loja física de embalagens, descartáveis e artigos de confeitaria e festas. Junta a gestão da loja (produtos, estoque com lote, validade e peso, notas de entrada, usuários) e, nas fases seguintes, o balcão, a loja online com retirada na loja e os indicadores.

Sucesso: o saldo do sistema é igual ao da prateleira, e quem cuida da loja resolve o dia a dia sem programar.

## Positioning

Um estoque só, compartilhado entre o balcão e o site: se o sistema mostra que tem, a prateleira tem. Feito sob medida para uma loja de festas e confeitaria, com lote e validade (chocolate, corante, granulado) e venda a granel por peso.

## Operating Context

- Catálogo de 300 a 1.000 produtos, com variações (ex.: forminha nº 4 marrom), grade de tamanhos e cores, formas de venda e fotos.
- Mercadoria chega por nota de compra (XML do fornecedor) ou por entrada manual; saída por venda, perda ou ajuste. Movimentações nunca são apagadas: erro se corrige com estorno.
- "O que vence primeiro sai primeiro" (FEFO). Alertas de estoque abaixo do mínimo e de validade próxima, mais uma conferência diária.
- Contagem física (inventário) pensada primeiro para o celular.
- Interface em português do Brasil, moeda em R$, datas dd/mm/aaaa, fuso America/Sao_Paulo.

## Capabilities and Constraints

- Next.js (App Router), TypeScript, Tailwind CSS e shadcn/ui (estilo base-nova, componentes Base UI), ícones Lucide. Hospedado na Vercel; banco e login no Supabase.
- Fases: 1. Base (em construção: login, catálogo e estoque prontos; notas de entrada a seguir), 2. Balcão, 3. Loja online e retirada, 4. Gestão.
- As telas exclusivas do administrador não aparecem para a funcionária.
- Modo de teste (variável ENTRADA_DE_TESTE=1): botões que entram sem senha e uma faixa de aviso no topo do painel.
- Testes de tela (Playwright) localizam elementos por texto, papel e rótulo: mudar textos visíveis exige ajustar os testes.

## Brand Commitments

- Nome: **Di Boni**, "Artigos para festas". Instagram @diboni_, com o lema "Tudo para sua festa em um só lugar!".
- Logo: monograma "db" de duas hastes altas cujos topos formam um telhado no centro; o "d" em degradê roxo-magenta (cerca de #A03291 a #5C1655) e o "b" em azul-marinho (cerca de #111A53), com um brilho azul na base. Abaixo, "DI BONI" em letras arredondadas com reflexo, como balões, um fio magenta e "ARTIGOS PARA FESTAS" em letra serifada fina.
- Os posts do Instagram usam fundo violeta vibrante (cerca de #7020A0 a #B030E0).
- Cores medidas a partir da foto de perfil do Instagram e da imagem do logo enviada pelo usuário; não há manual de marca.

## Evidence on Hand

- Imagem do logo (1080 px, JPG com círculo de fundo listrado azul-claro) enviada no chat; ainda não há arquivo vetorial nem versão sem fundo no repositório.
- Manual de uso em `docs/manual/` e especificação em `docs/superpowers/specs/2026-10-21-fase-1-base-design.md`.
- Nenhum dado real da loja no sistema: o site principal usa o banco de teste.

## Product Principles

1. O saldo do sistema é a verdade da prateleira: o que pede ação (abaixo do mínimo, vencendo, solicitação pendente) aparece primeiro.
2. Quem tem mais dificuldade consegue usar: palavras por extenso, ações com o nome do que fazem, erros que dizem como resolver.
3. Funciona com a mão ocupada: no celular, o essencial cabe numa tela e os botões são fáceis de tocar.
4. Nada se perde sem querer: ações que não têm volta pedem confirmação, e correções viram estorno.
5. É da Di Boni: a identidade da loja aparece com discrição, sem atrapalhar o trabalho.

## Accessibility & Inclusion

Equipe com familiaridade mista: texto confortável de ler (não menor que 14 px no corpo), contraste WCAG AA, alvos de toque de pelo menos 44 px no celular, foco visível pelo teclado e rótulos em texto ao lado dos ícones.
