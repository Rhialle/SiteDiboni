# Fase 2.2: código de barras pela câmera do celular

- **Data:** 2026-11-23
- **Situação:** aprovada em 2026-11-23
- **Parte de:** [fase 2](2026-11-22-fase-2-balcao-design.md), parte 2.2.

## Por quê

Na contagem do inventário, quem conta anda pela loja com o celular e hoje digita o nome ou o código de cada produto. Ler o código de barras pela câmera deixa a contagem — principalmente a da loja inteira, na 2.3 — bem mais rápida e com menos erro de digitação. No balcão, a câmera serve de reserva quando o leitor USB falhar.

## Decisões do usuário

- Na loja há **iPhone** (ou iPhone e Android): o leitor precisa funcionar nos dois.
- Biblioteca **`barcode-detector`**, versão **3.2.3**. Usada como "ponyfill": o mesmo leitor que vem junto (zxing-wasm) lê no Android e no iPhone. (A primeira versão desta especificação dizia que no Android seria o leitor do navegador; corrigido na revisão.)

## O que muda

1. **Componente `LeitorDeCodigo`** (só no navegador): botão **Câmera**; abre a câmera traseira numa janela por cima da tela, com o vídeo e um quadro de mira; lê **EAN-13, EAN-8, UPC-A, UPC-E e Code 128**; ao ler, vibra (quando o aparelho deixa), fecha a câmera e entrega o código. **Fechar** cancela. Sem permissão de câmera, mostra "Libere a câmera nas configurações do navegador para ler o código." Sem câmera no aparelho, o botão não aparece.
2. **Contagem do inventário** (`/inventario/[id]`): o botão **Câmera** ao lado de **Buscar**; o código lido vai para a busca (a mesma busca de hoje, pelo endereço `?q=`), e o produto aparece para contar.
3. **Balcão** (`/balcao`): o botão **Câmera** ao lado do campo **Código ou nome**; o código lido entra como se tivesse sido bipado no leitor.
4. **Busca da contagem pelo código do pacote:** `itens_para_contar` passa a achar a variação também pelo código de barras da forma de venda (entrou na 2.1). Migração nova (a função já está no banco de teste).
5. **Leitor do iPhone hospedado no próprio site:** o arquivo do leitor (WebAssembly) é servido pelo site, e não por um serviço de fora, para não depender de outro endereço na loja. Ele só é baixado quando alguém toca em **Câmera**.

## Caminhos considerados

- **`barcode-detector` (escolhido):** câmera ao vivo, lê assim que o código aparece, um código só para Android e iPhone.
- **`@zxing/browser`:** funciona nos dois, mais lento e menos cuidado.
- **Foto e leitura da foto:** sem biblioteca pesada, mas muito mais lento por produto.

## Regras que não mudam

- A contagem continua às cegas (a câmera só preenche a busca).
- Digitar o nome ou o código continua funcionando igual.
- Nenhuma foto ou vídeo é gravado ou enviado: a leitura acontece no próprio aparelho.

## Como saber que deu certo

- Teste de banco: `itens_para_contar` acha a variação pelo código do pacote.
- Testes unitários: a escolha dos formatos e a limpeza do código lido (espaços, quebra de linha).
- Testes de tela: o botão **Câmera** aparece na contagem e no balcão (com câmera falsa do navegador de teste); o código entregue pelo leitor faz a busca na contagem e põe o item no balcão.
- **No celular de verdade (fora do código):** o usuário abre uma contagem e um balcão de teste no iPhone e no Android, lê três produtos, e anota se leu e quanto tempo levou. A leitura real pela câmera só se prova assim.
