"use client"

import { useState, useTransition } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import type { Papel } from "@/lib/auth/sessao"
import { formatarData } from "@/lib/formatacao"

import { alterarPapel, alterarSituacao, type ResultadoAcao } from "./acoes"

export type LinhaUsuario = {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  criado_em: string
}

const NOME_DO_PAPEL: Record<Papel, string> = {
  administrador: "Administrador",
  funcionario: "Funcionário",
}

export function TabelaUsuarios({ usuarios }: { usuarios: LinhaUsuario[] }) {
  const [erro, setErro] = useState("")
  const [executando, iniciar] = useTransition()

  function executar(acao: () => Promise<ResultadoAcao>) {
    setErro("")
    iniciar(async () => {
      const resultado = await acao()
      setErro(resultado.erro)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <MensagemDeErro>{erro}</MensagemDeErro>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Papel</th>
              <th className="px-3 py-2 font-medium">Situação</th>
              <th className="px-3 py-2 font-medium">Desde</th>
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-t">
                <td className="px-3 py-2">{usuario.nome}</td>
                <td className="px-3 py-2">{usuario.email}</td>
                <td className="px-3 py-2">{NOME_DO_PAPEL[usuario.papel]}</td>
                <td className="px-3 py-2">{usuario.ativo ? "Ativo" : "Desativado"}</td>
                <td className="px-3 py-2">{formatarData(usuario.criado_em)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={executando}
                      onClick={() =>
                        executar(() =>
                          alterarPapel(
                            usuario.id,
                            usuario.papel === "administrador" ? "funcionario" : "administrador",
                          ),
                        )
                      }
                    >
                      {usuario.papel === "administrador" ? "Tornar funcionário" : "Tornar administrador"}
                    </Button>
                    <Button
                      variant={usuario.ativo ? "destructive" : "outline"}
                      size="sm"
                      disabled={executando}
                      onClick={() => executar(() => alterarSituacao(usuario.id, !usuario.ativo))}
                    >
                      {usuario.ativo ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
