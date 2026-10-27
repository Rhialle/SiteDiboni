// Como os valores do banco aparecem nas telas.
export const ROTULO_SITUACAO: Record<string, string> = {
  incompleto: "Incompleto",
  ativo: "Ativo",
  inativo: "Inativo",
}

export const ROTULO_TIPO_VENDA = {
  unidade: "Por unidade",
  peso: "Por peso",
} as const

// Origem da mercadoria (tabela A da NF-e).
export const ORIGENS_FISCAIS = [
  { valor: 0, rotulo: "0 – Nacional" },
  { valor: 1, rotulo: "1 – Estrangeira, importação direta" },
  { valor: 2, rotulo: "2 – Estrangeira, comprada no Brasil" },
  { valor: 3, rotulo: "3 – Nacional, mais de 40% importado" },
  { valor: 4, rotulo: "4 – Nacional, processo produtivo básico" },
  { valor: 5, rotulo: "5 – Nacional, até 40% importado" },
  { valor: 6, rotulo: "6 – Estrangeira direta, sem similar nacional" },
  { valor: 7, rotulo: "7 – Estrangeira comprada no Brasil, sem similar" },
  { valor: 8, rotulo: "8 – Nacional, mais de 70% importado" },
]

export const PROPRIEDADES = [
  { campo: "apto_forno", rotulo: "Pode ir ao forno" },
  { campo: "apto_freezer", rotulo: "Pode ir ao freezer" },
  { campo: "apto_microondas", rotulo: "Pode ir ao micro-ondas" },
  { campo: "apto_alimento", rotulo: "Pode ter contato com alimento" },
] as const
