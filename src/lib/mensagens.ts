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
  fotoGrande: "A foto precisa ter até 5 MB.",
  fotoFormato: "Use uma foto em JPG, PNG ou WebP.",
  fotoLimite: "Cada produto pode ter até 8 fotos.",
  compatibilidadeRepetida: "Estas variações já estão ligadas.",
  compatibilidadeMesma: "Escolha uma variação diferente.",
  percentualInvalido: "Informe o reajuste em %, por exemplo 10 ou -5.",
  nenhumSelecionado: "Selecione pelo menos um produto.",
  salvo: "Alterações salvas.",
  gradeSemNovidade: "Nenhuma variação nova: todas as combinações já existiam.",
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
