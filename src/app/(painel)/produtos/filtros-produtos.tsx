import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type Filtros = {
  q: string
  categoria: string
  situacao: string
  tipo: string
  validade: string
  material: string
}

const SELECT = "campo-escolha"

function Escolha({
  id,
  rotulo,
  nome,
  valor,
  opcoes,
}: {
  id: string
  rotulo: string
  nome: string
  valor: string
  opcoes: { valor: string; rotulo: string }[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <select id={id} name={nome} defaultValue={valor} className={SELECT}>
        <option value="">Todos</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  )
}

// Formulário GET: a busca e os filtros ficam na URL, então dá para voltar e compartilhar o resultado.
export function FiltrosProdutos({
  filtros,
  categorias,
  materiais,
}: {
  filtros: Filtros
  categorias: { id: string; caminho: string }[]
  materiais: { id: string; nome: string }[]
}) {
  return (
    <form method="get" action="/produtos" className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="busca-produtos">Buscar</Label>
        <Input
          id="busca-produtos"
          name="q"
          defaultValue={filtros.q}
          placeholder="Nome, fornecedor, código interno ou de barras"
          className="w-72"
        />
      </div>
      <Escolha id="filtro-categoria" rotulo="Categoria" nome="categoria" valor={filtros.categoria}
        opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.caminho }))} />
      <Escolha id="filtro-situacao" rotulo="Situação" nome="situacao" valor={filtros.situacao}
        opcoes={[
          { valor: "incompleto", rotulo: "Incompleto" },
          { valor: "ativo", rotulo: "Ativo" },
          { valor: "inativo", rotulo: "Inativo" },
        ]} />
      <Escolha id="filtro-tipo" rotulo="Tipo de venda" nome="tipo" valor={filtros.tipo}
        opcoes={[
          { valor: "unidade", rotulo: "Por unidade" },
          { valor: "peso", rotulo: "Por peso" },
        ]} />
      <Escolha id="filtro-validade" rotulo="Validade" nome="validade" valor={filtros.validade}
        opcoes={[
          { valor: "sim", rotulo: "Controla validade" },
          { valor: "nao", rotulo: "Não controla" },
        ]} />
      <Escolha id="filtro-material" rotulo="Material" nome="material" valor={filtros.material}
        opcoes={materiais.map((m) => ({ valor: m.id, rotulo: m.nome }))} />
      <Button type="submit" variant="outline">
        Buscar
      </Button>
    </form>
  )
}
