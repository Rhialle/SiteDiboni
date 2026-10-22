"use client"

import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"

import { MensagemDeErro } from "@/components/tela-de-acesso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MENSAGENS } from "@/lib/mensagens"
import { criarClienteNavegador } from "@/lib/supabase/navegador"

type Fator = { id: string; cadastro?: { qrCode: string; segredo: string } }

export function VerificacaoDuasEtapas() {
  const id = useId()
  const [fator, setFator] = useState<Fator | null>(null)
  const [erro, setErro] = useState("")
  const [enviando, setEnviando] = useState(false)
  const preparado = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (preparado.current) return
    preparado.current = true

    async function preparar() {
      const supabase = criarClienteNavegador()
      const { data: fatores } = await supabase.auth.mfa.listFactors()

      const verificado = fatores?.totp.find((f) => f.status === "verified")
      if (verificado) {
        setFator({ id: verificado.id })
        return
      }

      // Um cadastro que ficou pela metade impede começar outro.
      for (const pendente of fatores?.all ?? []) {
        if (pendente.factor_type === "totp" && pendente.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: pendente.id })
        }
      }

      const { data: novo, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Celular",
      })
      if (error || !novo) {
        setErro("Não foi possível iniciar a verificação. Recarregue a página.")
        return
      }
      setFator({ id: novo.id, cadastro: { qrCode: novo.totp.qr_code, segredo: novo.totp.secret } })
    }

    void preparar()
  }, [])

  async function confirmar(formData: FormData) {
    if (!fator) return
    setEnviando(true)
    setErro("")

    const supabase = criarClienteNavegador()
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: fator.id,
      code: String(formData.get("codigo") ?? "").trim(),
    })
    if (error) {
      setErro(MENSAGENS.codigoIncorreto)
      setEnviando(false)
      return
    }
    // A sessão já verificada está nos cookies; o servidor relê ao navegar.
    router.replace("/inicio")
    router.refresh()
  }

  if (!fator) {
    return erro ? <MensagemDeErro>{erro}</MensagemDeErro> : <p className="text-sm">Preparando…</p>
  }

  return (
    <form action={confirmar} className="flex flex-col gap-4">
      {fator.cadastro ? (
        <div className="flex flex-col items-center gap-3 text-sm">
          <p>Leia o QR code com o aplicativo do celular:</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- QR code vem como imagem SVG em data URL */}
          <img src={fator.cadastro.qrCode} alt="QR code da verificação em duas etapas" className="size-44" />
          <p className="text-muted-foreground">Ou digite este código no aplicativo:</p>
          <code
            data-testid="segredo-duas-etapas"
            className="rounded bg-muted px-2 py-1 font-mono text-xs break-all"
          >
            {fator.cadastro.segredo}
          </code>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-codigo`}>Código de 6 dígitos</Label>
        <Input
          id={`${id}-codigo`}
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
      </div>
      <MensagemDeErro>{erro}</MensagemDeErro>
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Confirmando…" : "Confirmar"}
      </Button>
    </form>
  )
}
