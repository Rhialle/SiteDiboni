import { formatarData } from "@/lib/formatacao"

// Textos fixos da interface (plano 1.1, "Textos fixos da interface").
export const MENSAGENS = {
  credenciais: "E-mail ou senha incorretos.",
  desativado: "Este usuário está desativado. Fale com o administrador.",
  linkInvalido: "Este link expirou ou já foi usado. Peça um novo ao administrador.",
  semPermissao: "Você não tem permissão para acessar esta página.",
  codigoIncorreto: "Código incorreto. Confira o aplicativo e tente de novo.",
  senhaCurta: "A senha precisa ter pelo menos 8 caracteres.",
  senhaIgual: "A nova senha precisa ser diferente da atual.",
  senhaFalhou: "Não foi possível salvar a senha. Tente de novo.",
  recuperacaoPedida:
    "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.",
  ultimoAdministrador: "Precisa existir pelo menos um administrador ativo.",
  emailRepetido: "Já existe um usuário com este e-mail.",
  nomeObrigatorio: "Informe o nome.",
  conviteFalhou: "Não foi possível enviar o convite. Tente de novo.",
  acaoFalhou: "Não foi possível concluir. Tente de novo.",
  cnpjInvalido: "CNPJ inválido.",
  limiteInvalido: "Informe o limite em reais, por exemplo 50,00.",
  diasInvalidos: "Informe os dias como números inteiros maiores que zero, separados por vírgula.",
  configuracoesSalvas: "Configurações salvas.",
  categoriaRepetida: "Já existe uma categoria com este nome aqui.",
  categoriaEmUso: "Esta categoria tem subcategorias ou produtos e não pode ser apagada.",
  categoriaCiclo: "Uma categoria não pode ficar dentro dela mesma.",
  materialRepetido: "Este material já existe.",
  materialEmUso: "Este material está em produtos e não pode ser apagado.",
  codigoBarrasInvalido: "Código de barras inválido.",
  codigoBarrasRepetido: "Este código de barras já está em outra variação.",
  codigoInternoRepetido: "Este código interno já está em outra variação.",
  ncmInvalido: "O NCM precisa ter 8 dígitos.",
  cestInvalido: "O CEST precisa ter 7 dígitos.",
  faixaForaDeOrdem:
    "O preço de cada faixa precisa ser menor que o preço normal e que o da faixa anterior.",
  faixaRepetida: "Já existe uma faixa com esta quantidade mínima.",
  tipoVendaConflito: "Não dá para mudar o tipo de venda: há formas de venda que não combinam com ele.",
  granelSoPeso: "Só produto vendido por peso tem forma a granel.",
  pesoSoGranel: "Produto vendido por peso só tem forma a granel.",
  itemNaoExiste: "Algum item escolhido não existe mais. Recarregue a página e tente de novo.",
  variacaoRepetida: "Já existe uma variação com estes atributos.",
  fotoGrande: "A foto precisa ter até 5 MB.",
  fotoFormato: "Use uma foto em JPG, PNG ou WebP.",
  fotoLimite: "Cada produto pode ter até 8 fotos.",
  compatibilidadeRepetida: "Estas variações já estão ligadas.",
  compatibilidadeMesma: "Escolha uma variação diferente.",
  percentualInvalido: "Informe o reajuste em %, por exemplo 10 ou -5.",
  nenhumSelecionado: "Selecione pelo menos um produto.",
  salvo: "Alterações salvas.",
  gradeSemNovidade: "Nenhuma variação nova: todas as combinações já existiam.",
  gradeInvalida: "Escreva um atributo por linha, assim: Tamanho: 4, 6, 12",
  precoInvalido: "Informe o preço em reais, por exemplo 6,00.",
  quantidadeInvalida: "Informe uma quantidade inteira maior que zero.",
  faixaMinima: "A faixa começa em pelo menos 2.",
  medidaInvalida: "Medidas e capacidade são números inteiros maiores que zero.",
  estoqueMinimoInvalido: "O estoque mínimo é um número inteiro, zero ou mais.",
  formaGranelEmLista: "Forma a granel não tem faixas de preço.",
  variacaoNaoEncontrada: "Nenhuma variação com este código interno.",
  pesoInvalido: "Informe o peso em kg com até 3 casas, por exemplo 1,250.",
  custoObrigatorio: "Informe o custo (brinde ou amostra entra com 0,00).",
  custoInvalido: "Informe o custo em reais, por exemplo 12,00.",
  entradaRegistrada: "Entrada registrada.",
  movimentacaoRegistrada: "Movimentação registrada.",
  virouSolicitacao: "Acima do seu limite: virou uma solicitação para o administrador aprovar.",
  estornoRegistrado: "Estorno registrado.",
  jaEstornada: "Esta movimentação já foi estornada.",
  nenhumAviso: "Nenhum aviso.",
  tipoPerdaInvalido: "Escolha o tipo: perda, quebra ou ajuste.",
  unidadeMudou: "A unidade escolhida em “Em” não vale mais. Recarregue a página e confira.",
} as const

export function mensagemConviteEnviado(email: string): string {
  return `Convite enviado para ${email}.`
}

export function mensagemReajuste(produtos: number): string {
  return `Reajuste aplicado em ${produtos} produto(s).`
}

export function mensagemGradeCriada(variacoes: number): string {
  return variacoes === 0 ? MENSAGENS.gradeSemNovidade : `${variacoes} variação(ões) criada(s).`
}

export function mensagemPendencias(itens: string[]): string {
  return `Para ficar ativo falta: ${itens.join(", ")}.`
}

export type ContagensDoInicio = {
  vencendo: number
  faixa_maior: number
  vencidos: number
  abaixo_minimo: number
  solicitacoes_pendentes: number
  conferencia_em: string | null
  conferencia_divergencias: number | null
}

// Avisos do Início: um por contagem maior que zero. A conferência só aparece quando achou diferença.
export function avisosDoInicio(c: ContagensDoInicio): { texto: string; link: string | null }[] {
  const avisos: { texto: string; link: string | null }[] = []
  if (c.vencendo > 0) avisos.push({ texto: `${c.vencendo} lote(s) vencem em até ${c.faixa_maior} dias`, link: "/alertas" })
  if (c.vencidos > 0) avisos.push({ texto: `${c.vencidos} lote(s) vencidos com saldo`, link: "/alertas" })
  if (c.abaixo_minimo > 0) {
    avisos.push({ texto: `${c.abaixo_minimo} variação(ões) abaixo do estoque mínimo`, link: "/alertas" })
  }
  if (c.solicitacoes_pendentes > 0) {
    avisos.push({ texto: `${c.solicitacoes_pendentes} solicitação(ões) pendente(s)`, link: "/estoque/solicitacoes" })
  }
  if (c.conferencia_em && c.conferencia_divergencias) {
    avisos.push({
      texto: `A conferência de ${formatarData(c.conferencia_em)} achou ${c.conferencia_divergencias} diferença(s) entre saldo e movimentações.`,
      link: null,
    })
  }
  return avisos
}
