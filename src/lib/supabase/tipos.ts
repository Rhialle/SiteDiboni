
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categorias": {
                  Row: {
                    "categoria_pai_id": string | null,"id": string,"nome": string,"ordem": number
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_pai_id"?: string | null,"id"?: string,"nome": string,"ordem"?: number
                  }
                  Update: {
                    "categoria_pai_id"?: string | null,"id"?: string,"nome"?: string,"ordem"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categorias_categoria_pai_id_fkey"
      columns: ["categoria_pai_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    }
                  ]
                },"compatibilidades": {
                  Row: {
                    "descricao": string,"id": string,"variacao_a_id": string,"variacao_b_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "descricao"?: string,"id"?: string,"variacao_a_id": string,"variacao_b_id": string
                  }
                  Update: {
                    "descricao"?: string,"id"?: string,"variacao_a_id"?: string,"variacao_b_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "compatibilidades_variacao_a_id_fkey"
      columns: ["variacao_a_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "compatibilidades_variacao_b_id_fkey"
      columns: ["variacao_b_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"configuracoes": {
                  Row: {
                    "atualizado_em": string,"cnpj_loja": string | null,"dias_alerta_validade": (number)[],"id": number,"limite_ajuste_centavos": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cnpj_loja"?: string | null,"dias_alerta_validade"?: (number)[],"id"?: number,"limite_ajuste_centavos"?: number
                  }
                  Update: {
                    "atualizado_em"?: string,"cnpj_loja"?: string | null,"dias_alerta_validade"?: (number)[],"id"?: number,"limite_ajuste_centavos"?: number
                  }
                  Relationships: [
                    
                  ]
                },"etiquetas": {
                  Row: {
                    "id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"nome": string
                  }
                  Update: {
                    "id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"faixas_preco": {
                  Row: {
                    "forma_venda_id": string,"id": string,"preco_centavos": number,"quantidade_minima": number
                  }
                  ComputedFields: never
                  Insert: {
                    "forma_venda_id": string,"id"?: string,"preco_centavos": number,"quantidade_minima": number
                  }
                  Update: {
                    "forma_venda_id"?: string,"id"?: string,"preco_centavos"?: number,"quantidade_minima"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "faixas_preco_forma_venda_id_fkey"
      columns: ["forma_venda_id"]
isOneToOne: false
      referencedRelation: "formas_venda"
      referencedColumns: ["id"]
    }
                  ]
                },"formas_venda": {
                  Row: {
                    "ativa": boolean,"fator": number,"id": string,"nome": string,"peso_variavel": boolean,"preco_centavos": number,"variacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativa"?: boolean,"fator": number,"id"?: string,"nome": string,"peso_variavel"?: boolean,"preco_centavos": number,"variacao_id": string
                  }
                  Update: {
                    "ativa"?: boolean,"fator"?: number,"id"?: string,"nome"?: string,"peso_variavel"?: boolean,"preco_centavos"?: number,"variacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "formas_venda_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"fotos": {
                  Row: {
                    "caminho": string,"criado_em": string,"id": string,"ordem": number,"produto_id": string,"variacao_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caminho": string,"criado_em"?: string,"id"?: string,"ordem"?: number,"produto_id": string,"variacao_id"?: string | null
                  }
                  Update: {
                    "caminho"?: string,"criado_em"?: string,"id"?: string,"ordem"?: number,"produto_id"?: string,"variacao_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fotos_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fotos_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos_com_situacao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fotos_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"historico_cadastro": {
                  Row: {
                    "campo": string,"em": string,"id": number,"registro_id": string | null,"tabela": string,"usuario_id": string | null,"valor_antigo": string | null,"valor_novo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "campo": string,"em"?: string,"id"?: never,"registro_id"?: string | null,"tabela": string,"usuario_id"?: string | null,"valor_antigo"?: string | null,"valor_novo"?: string | null
                  }
                  Update: {
                    "campo"?: string,"em"?: string,"id"?: never,"registro_id"?: string | null,"tabela"?: string,"usuario_id"?: string | null,"valor_antigo"?: string | null,"valor_novo"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"produto_categorias": {
                  Row: {
                    "categoria_id": string,"produto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id": string,"produto_id": string
                  }
                  Update: {
                    "categoria_id"?: string,"produto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "produto_categorias_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "produto_categorias_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "produto_categorias_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos_com_situacao"
      referencedColumns: ["id"]
    }
                  ]
                },"produto_etiquetas": {
                  Row: {
                    "etiqueta_id": string,"produto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "etiqueta_id": string,"produto_id": string
                  }
                  Update: {
                    "etiqueta_id"?: string,"produto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "produto_etiquetas_etiqueta_id_fkey"
      columns: ["etiqueta_id"]
isOneToOne: false
      referencedRelation: "etiquetas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "produto_etiquetas_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "produto_etiquetas_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos_com_situacao"
      referencedColumns: ["id"]
    }
                  ]
                },"produtos": {
                  Row: {
                    "apto_alimento": boolean,"apto_forno": boolean,"apto_freezer": boolean,"apto_microondas": boolean,"atualizado_em": string,"cest": string | null,"controla_validade": boolean,"criado_em": string,"descricao": string,"id": string,"inativo": boolean,"ncm": string | null,"nome": string,"origem_fiscal": number | null,"tipo_venda": Database["public"]['Enums']["tipo_venda"]
                  }
                  ComputedFields: never
                  Insert: {
                    "apto_alimento"?: boolean,"apto_forno"?: boolean,"apto_freezer"?: boolean,"apto_microondas"?: boolean,"atualizado_em"?: string,"cest"?: string | null,"controla_validade"?: boolean,"criado_em"?: string,"descricao"?: string,"id"?: string,"inativo"?: boolean,"ncm"?: string | null,"nome": string,"origem_fiscal"?: number | null,"tipo_venda": Database["public"]['Enums']["tipo_venda"]
                  }
                  Update: {
                    "apto_alimento"?: boolean,"apto_forno"?: boolean,"apto_freezer"?: boolean,"apto_microondas"?: boolean,"atualizado_em"?: string,"cest"?: string | null,"controla_validade"?: boolean,"criado_em"?: string,"descricao"?: string,"id"?: string,"inativo"?: boolean,"ncm"?: string | null,"nome"?: string,"origem_fiscal"?: number | null,"tipo_venda"?: Database["public"]['Enums']["tipo_venda"]
                  }
                  Relationships: [
                    
                  ]
                },"usuarios": {
                  Row: {
                    "ativo": boolean,"criado_em": string,"email": string,"id": string,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"criado_em"?: string,"email": string,"id": string,"nome": string,"papel"?: Database["public"]['Enums']["papel_usuario"]
                  }
                  Update: {
                    "ativo"?: boolean,"criado_em"?: string,"email"?: string,"id"?: string,"nome"?: string,"papel"?: Database["public"]['Enums']["papel_usuario"]
                  }
                  Relationships: [
                    
                  ]
                },"variacoes": {
                  Row: {
                    "altura_mm": number | null,"ativa": boolean,"atributos": NonNullable<Json>,"capacidade_ml": number | null,"codigo_barras": string | null,"codigo_interno": string,"comprimento_mm": number | null,"criado_em": string,"estoque_minimo": number,"id": string,"largura_mm": number | null,"nome": string,"produto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "altura_mm"?: number | null,"ativa"?: boolean,"atributos"?: NonNullable<Json>,"capacidade_ml"?: number | null,"codigo_barras"?: string | null,"codigo_interno"?: string,"comprimento_mm"?: number | null,"criado_em"?: string,"estoque_minimo"?: number,"id"?: string,"largura_mm"?: number | null,"nome": string,"produto_id": string
                  }
                  Update: {
                    "altura_mm"?: number | null,"ativa"?: boolean,"atributos"?: NonNullable<Json>,"capacidade_ml"?: number | null,"codigo_barras"?: string | null,"codigo_interno"?: string,"comprimento_mm"?: number | null,"criado_em"?: string,"estoque_minimo"?: number,"id"?: string,"largura_mm"?: number | null,"nome"?: string,"produto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "variacoes_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "variacoes_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos_com_situacao"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "produtos_com_situacao": {
                  Row: {
                    "apto_alimento": boolean | null,"apto_forno": boolean | null,"apto_freezer": boolean | null,"apto_microondas": boolean | null,"atualizado_em": string | null,"cest": string | null,"controla_validade": boolean | null,"criado_em": string | null,"descricao": string | null,"id": string | null,"inativo": boolean | null,"ncm": string | null,"nome": string | null,"origem_fiscal": number | null,"pendencias": (string)[] | null,"situacao": string | null,"tipo_venda": Database["public"]['Enums']["tipo_venda"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "alterar_categoria_em_massa":
{ Args: { "p_categoria": string,"p_incluir": boolean,"p_produtos": (string)[] }; Returns: number
                           },
"alterar_inativo_em_massa":
{ Args: { "p_inativo": boolean,"p_produtos": (string)[] }; Returns: number
                           },
"buscar_produtos":
{ Args: { "p_categoria": string,"p_controla_validade": boolean,"p_deslocamento": number,"p_etiqueta": string,"p_limite": number,"p_situacao": string,"p_termo": string,"p_tipo_venda": Database["public"]['Enums']["tipo_venda"] }; Returns: {
              "id": string,"menor_preco_centavos": number,"nome": string,"situacao": string,"tipo_venda": Database["public"]['Enums']["tipo_venda"],"total": number,"variacoes": number
            }[]
                           },
"cnpj_valido":
{ Args: { "cnpj": string }; Returns: boolean
                           },
"criar_produto":
{ Args: { "dados": Json }; Returns: string
                           },
"eh_administrador":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"eh_usuario_ativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"gtin_valido":
{ Args: { "codigo": string }; Returns: boolean
                           },
"papel_atual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["papel_usuario"]
                           },
"proximo_codigo_interno":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"reajustar_precos":
{ Args: { "p_percentual": number,"p_produtos": (string)[] }; Returns: number
                           }
          }
          Enums: {
            "papel_usuario": "administrador"|"funcionario","tipo_venda": "unidade"|"peso"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "papel_usuario": ["administrador", "funcionario"],"tipo_venda": ["unidade", "peso"]
          }
        }
} as const
