import type { ReactNode } from "react"

// Remonta a cada troca de seção do menu: cada tela entra subindo e entrando em foco.
export default function TemplatePainel({ children }: { children: ReactNode }) {
  return <div className="entra-tela">{children}</div>
}
