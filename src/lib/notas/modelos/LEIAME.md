# Notas de exemplo para os testes

XMLs de NF-e (modelo 55, autorizada, layout 4.00) **com todos os dados inventados**. Seguem a estrutura de uma nota real de compra da loja: as etiquetas e o encaixe entre elas. Nenhum CNPJ, nome, endereço, chave, valor ou código veio da nota real. As notas reais nunca entram no repositório nem no banco de teste.

CNPJs usados (válidos, de teste):

| Papel | CNPJ | Nome |
|---|---|---|
| Destinatário (a "loja" dos testes) | `11222333000181` | Loja de Exemplo Ltda |
| Emitente de `nota-com-lote.xml` | `11444777000161` | Embalagens Exemplo Ltda |
| Emitente de `nota-simples.xml` | `04252011000110` | Doces Exemplo Ltda |

## `nota-simples.xml`

- **Chave:** `17261004252011000110550010000001231000001239`.
- **Nota:** número 123, série 1, emitida em 20/10/2026.
- **Um item** (`GM14`, "GOMA DE MASCAR MENTA 12X25G"):
  - código de barras `7891000000014`, NCM `17041000`;
  - 2 DP a R$ 45,00, valor do produto R$ 90,00;
  - IPI R$ 4,50 (em `IPITrib`), sem desconto, frete ou ICMS-ST;
  - custo do item: R$ 94,50;
  - sem `rastro`.

## `nota-com-lote.xml`

- **Chave:** `17261011444777000161550010000004561000004565`.
- **Nota:** número 456, série 1, emitida em 21/10/2026.
- **Três itens:**

| nº | Código | Unidade | Quantidade | O que testa | Custo do item |
|---|---|---|---|---|---|
| 1 | `A1` | CX | 2.5000 | `cEAN` "SEM GTIN"; vProd 100,00, vDesc 5,00, vFrete 2,50, vOutro 0,50, IPI 1,00 e ICMS-ST 3,00 (em `ICMS10`) | 102,00 |
| 2 | `B2` | KG | 2.0000 | `rastro` com 2 lotes (L1: 1.500, validade 2027-03-10; L2: 0.500, validade 2027-05-22); IPI não tributado (`IPINT`) | 64,00 |
| 3 | `C3` | UN | 10.0000 | `cEAN` vazio; Simples Nacional (`ICMSSN102`) | 25,00 |

Os testes também derivam destes arquivos as notas sem autorização (sem `protNFe` ou com `cStat` diferente de 100 e 150), a de modelo 65 e a de outro destinatário.
