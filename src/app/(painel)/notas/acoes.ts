"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import { exigirUsuario } from "@/lib/auth/sessao"
import { mensagemDoErroDoBanco } from "@/lib/catalogo/erros"
import { MENSAGENS, mensagemNotaImportada } from "@/lib/mensagens"
import { TAMANHO_MAXIMO_XML } from "@/lib/notas/limites"
import { lerNotaXml, paraDadosDeImportacao } from "@/lib/notas/xml"
import { criarClienteServidor } from "@/lib/supabase/servidor"

export type ResultadoDoArquivo = { arquivo: string; erro: string; sucesso: string; notaId: string | null }

// Um arquivo por chamada: o navegador manda um de cada vez (nenhum envio passa do limite da Vercel).
export async function importarXml(nomeArquivo: string, conteudo: string): Promise<ResultadoDoArquivo> {
  await exigirUsuario()
  const falha = (erro: string): ResultadoDoArquivo => ({ arquivo: String(nomeArquivo), erro, sucesso: "", notaId: null })
  // Uma ação do servidor pode ser chamada com qualquer coisa, não só pelo formulário.
  if (typeof nomeArquivo !== "string" || typeof conteudo !== "string") return falha(MENSAGENS.acaoFalhou)
  if (Buffer.byteLength(conteudo, "utf8") > TAMANHO_MAXIMO_XML) return falha(MENSAGENS.xmlGrande)

  const lida = lerNotaXml(conteudo)
  if (!lida.ok) return falha(lida.erro)

  // O XML original fica guardado; se a importação não der certo, o arquivo enviado sai de novo.
  const supabase = await criarClienteServidor()
  const caminho = `${randomUUID()}.xml`
  const { error: erroEnvio } = await supabase.storage.from("notas-xml").upload(caminho, conteudo, { contentType: "text/xml" })
  if (erroEnvio) return falha(MENSAGENS.acaoFalhou)

  const { data: notaId, error } = await supabase.rpc("importar_nota", { dados: paraDadosDeImportacao(lida.nota, caminho) })
  if (error) {
    await supabase.storage.from("notas-xml").remove([caminho])
    return falha(mensagemDoErroDoBanco(error))
  }

  const { count } = await supabase
    .from("notas_entrada_itens")
    .select("id", { count: "exact", head: true })
    .eq("nota_id", notaId)
    .is("variacao_id", null)
  revalidatePath("/notas")
  return {
    arquivo: nomeArquivo,
    erro: "",
    sucesso: mensagemNotaImportada(lida.nota.numero, lida.nota.emitente.nome, count ?? 0),
    notaId,
  }
}
