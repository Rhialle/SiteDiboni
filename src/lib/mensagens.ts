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
} as const

export function mensagemConviteEnviado(email: string): string {
  return `Convite enviado para ${email}.`
}
