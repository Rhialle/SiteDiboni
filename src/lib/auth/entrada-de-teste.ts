// Modo de teste: botões que entram sem senha, numa conta de teste, enquanto a variável
// ENTRADA_DE_TESTE=1 estiver na Vercel. Qualquer pessoa com o endereço entra; por isso, com o modo
// ligado, nada de dados reais. Desligar (apagar a variável) antes de a loja usar de verdade.

export type PapelDeTeste = "administrador" | "funcionario"

// Endereços .test nunca recebem e-mail.
export const CONTAS_DE_TESTE: Record<PapelDeTeste, { email: string; nome: string }> = {
  administrador: { email: "admin.teste@diboni.test", nome: "Administrador de teste" },
  funcionario: { email: "funcionaria.teste@diboni.test", nome: "Funcionária de teste" },
}

export function entradaDeTesteLigada(ambiente: Record<string, string | undefined> = process.env): boolean {
  return ambiente.ENTRADA_DE_TESTE === "1"
}
