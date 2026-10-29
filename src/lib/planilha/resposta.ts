// O .xlsx como download (sem cache: a exportação muda a cada cadastro).
export function arquivoXlsx(conteudo: ArrayBuffer, nome: string): Response {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  })
}
