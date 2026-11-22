# Fluidez, etapa 2 (menos idas ao banco): registro da execução

Registro gravado durante a execução do [plano da etapa 2](2026-11-22-fluidez-2-menos-idas.md): medições, decisões tomadas fora do plano (`Ruling:`), evidências de teste e o que ficou para depois (`minor (deferred)`).

## Medição

Tempo de servidor de cada tela (mediana de 7 buscas da tela inteira, depois de 1 de aquecimento), no Chrome, como administrador de teste. O banco de teste não tem nenhuma nota de entrada, por isso a ficha da nota não foi medida.

| Tela | Antes (site principal, main c82d266, 2026-11-22 10:48) | Depois |
|---|---|---|
| `/inicio` | 547 ms | |
| `/produtos` | 828 ms | |
| `/estoque` | 512 ms | |
| `/inventario` | 572 ms | |
| `/inventario/1` | 778 ms | |
| `/produtos/[id]` (ficha) | 1.100 ms | |
