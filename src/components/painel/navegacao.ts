import { Bell, Boxes, ClipboardList, FolderTree, House, Package, ReceiptText, Settings, Users, type LucideIcon } from "lucide-react"

// Itens do menu do painel. O layout (servidor) monta a lista conforme o papel; menu e abas só desenham.
export type ItemDoMenu = {
  href: string
  rotulo: string
  icone: keyof typeof ICONES
  grupo: "principal" | "administracao"
}

export const ICONES = {
  inicio: House,
  produtos: Package,
  estoque: Boxes,
  alertas: Bell,
  notas: ReceiptText,
  inventario: ClipboardList,
  categorias: FolderTree,
  usuarios: Users,
  configuracoes: Settings,
} satisfies Record<string, LucideIcon>

// "/estoque/movimentacoes" deixa "Estoque" marcado.
export function estaAtivo(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`)
}
