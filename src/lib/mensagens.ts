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
  xmlGrande: "O arquivo precisa ter até 4 MB.",
  xmlDemais: "Escolha até 50 arquivos por vez.",
  xmlNenhum: "Escolha pelo menos um arquivo XML.",
  notaRepetida: "Esta nota já foi importada.",
  fatorInvalido: "Informe o fator como número inteiro maior que zero.",
  codigoNaoEncontrado: "Nenhuma variação com este código interno ou de barras.",
  itemLigado: "Item ligado.",
  produtoCriadoELigado: "Produto criado e item ligado. Complete o cadastro dele em Produtos.",
  produtoCriadoSemLigacao: "O produto foi criado mesmo assim: ligue o item pelo código interno, sem criar de novo.",
  itemSemLigacao: "Este item ainda não está ligado: o administrador precisa ligá-lo.",
  recebimentoSalvo: "Recebimento salvo.",
  notaConfirmada: "Nota confirmada: o estoque foi atualizado.",
  notaDescartada: "Nota descartada.",
  planilhaInvalida: "Arquivo inválido: use uma planilha .xlsx (o modelo baixado do sistema).",
  planilhaGrande: "A planilha precisa ter até 4 MB.",
  planilhaNenhuma: "Escolha a planilha .xlsx.",
  planilhaLinhasDemais: "Cada aba pode ter até 5.000 linhas.",
  preenchaCampo: "Preencha este campo.",
  simOuNao: "Use S ou N.",
  unidadeOuPeso: "Use unidade ou peso.",
  inteiroPositivo: "Use um número inteiro maior que zero.",
  inteiroZeroOuMais: "Use um número inteiro, zero ou mais.",
  categoriasPlanilha: "Escreva as categorias assim: Bolos > Caixas para bolo; Festa.",
  codigoRepetidoPlanilha: "Este código interno aparece em mais de uma linha.",
  produtoDiferente: "As linhas do mesmo produto precisam ter o mesmo valor nesta coluna.",
  produtoAmbiguo: "Há mais de um produto com este nome: para acrescentar a variação, use a ficha do produto.",
  formaSemPrecoNormal: "Falta a linha com quantidade mínima 1 (o preço normal) desta forma.",
  formaRepetidaPlanilha: "Esta forma com esta quantidade mínima aparece em mais de uma linha.",
  fatorDiferente: "As linhas desta forma precisam ter o mesmo fator.",
  granelPlanilha: "Produto por peso tem uma forma só, com fator 1000 e preço por kg, sem faixas.",
  tipoVendaComMovimentacao: "Não dá para mudar o tipo de venda: o produto já tem movimentações de estoque.",
  validadeComSaldo: "Não dá para mudar o controle de validade: o produto tem estoque.",
  formaRepetida: "Esta variação já tem uma forma de venda com este nome.",
  nadaAImportar: "Nada a importar: a planilha é igual ao catálogo.",
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

export function mensagemNotaImportada(numero: string, fornecedor: string, semLigacao: number): string {
  const inicio = `Nota ${numero} de ${fornecedor}: importada`
  return semLigacao === 0
    ? `${inicio}, pronta para revisar.`
    : `${inicio}, aguardando o administrador ligar ${semLigacao} item(ns).`
}

// R6, com o mesmo texto que o banco usa quando recusa a ligação.
export function mensagemFatorNaoInteiro(
  item: { numero: number; descricao: string; unidade: string },
  quantidade: string,
  fator: number,
): string {
  return `Item ${item.numero} (${item.descricao}): ${quantidade} ${item.unidade} × ${fator} não dá quantidade inteira. Confira o fator.`
}

// O recebido e os lotes são digitados na unidade da nota; vezes o fator precisa dar inteiro (R6).
export function mensagemRecebidoInvalido(unidade: string): string {
  return `Informe o recebido em ${unidade}, com até 4 casas (vezes o fator precisa dar quantidade inteira).`
}

export function mensagemLoteInvalido(lote: number, unidade: string): string {
  return `Lote ${lote}: informe a quantidade em ${unidade}, maior que zero e com até 4 casas (vezes o fator precisa dar quantidade inteira).`
}

export function mensagemSemAba(aba: string): string {
  return `A planilha não tem a aba “${aba}”.`
}

export function mensagemSemColuna(aba: string, coluna: string): string {
  return `A aba “${aba}” não tem a coluna “${coluna}”.`
}

export function mensagemTamanhoMaximo(caracteres: number): string {
  return `Use até ${caracteres} caracteres.`
}

export function mensagemPreviaPlanilha(criados: number, atualizados: number, semMudanca: number): string {
  return `${criados} criado(s), ${atualizados} atualizado(s) e ${semMudanca} sem mudança.`
}

export function mensagemPlanilhaImportada(criados: number, atualizados: number): string {
  return `Planilha importada: ${criados} criado(s) e ${atualizados} atualizado(s).`
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
  notas_aguardando: number
}

export type AvisoDoInicio = {
  tipo: "vencidos" | "vencendo" | "abaixoDoMinimo" | "solicitacoes" | "notas" | "conferencia"
  // Número em destaque na carta e o texto que vem depois dele; a conferência não tem número.
  quantidade: number | null
  resto: string
  texto: string
  link: string | null
}

function avisoDeContagem(
  tipo: AvisoDoInicio["tipo"],
  quantidade: number,
  resto: string,
  link: string,
): AvisoDoInicio {
  return { tipo, quantidade, resto, texto: `${quantidade} ${resto}`, link }
}

// Avisos do Início, do mais urgente para o menos: um por contagem maior que zero.
// A conferência só aparece quando achou diferença.
export function avisosDoInicio(c: ContagensDoInicio): AvisoDoInicio[] {
  const avisos: AvisoDoInicio[] = []
  if (c.vencidos > 0) avisos.push(avisoDeContagem("vencidos", c.vencidos, "lote(s) vencidos com saldo", "/alertas"))
  if (c.vencendo > 0) {
    avisos.push(avisoDeContagem("vencendo", c.vencendo, `lote(s) vencem em até ${c.faixa_maior} dias`, "/alertas"))
  }
  if (c.abaixo_minimo > 0) {
    avisos.push(avisoDeContagem("abaixoDoMinimo", c.abaixo_minimo, "variação(ões) abaixo do estoque mínimo", "/alertas"))
  }
  if (c.solicitacoes_pendentes > 0) {
    avisos.push(
      avisoDeContagem("solicitacoes", c.solicitacoes_pendentes, "solicitação(ões) pendente(s)", "/estoque/solicitacoes"),
    )
  }
  if (c.notas_aguardando > 0) {
    avisos.push(
      avisoDeContagem(
        "notas",
        c.notas_aguardando,
        "nota(s) aguardando o administrador",
        "/notas?situacao=aguardando_administrador",
      ),
    )
  }
  if (c.conferencia_em && c.conferencia_divergencias) {
    const texto = `A conferência de ${formatarData(c.conferencia_em)} achou ${c.conferencia_divergencias} diferença(s) entre saldo e movimentações.`
    avisos.push({ tipo: "conferencia", quantidade: null, resto: texto, texto, link: null })
  }
  return avisos
}
