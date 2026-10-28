
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
                },"custos_variacao": {
                  Row: {
                    "atualizado_em": string,"custo_medio": number,"variacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"custo_medio": number,"variacao_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"custo_medio"?: number,"variacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "custos_variacao_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: true
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
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
                },"fornecedor_itens": {
                  Row: {
                    "atualizado_em": string,"codigo_barras": string | null,"codigo_fornecedor": string,"descricao_fornecedor": string,"fator": number,"fornecedor_id": string,"id": string,"unidade_fornecedor": string,"variacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"codigo_barras"?: string | null,"codigo_fornecedor": string,"descricao_fornecedor"?: string,"fator": number,"fornecedor_id": string,"id"?: string,"unidade_fornecedor": string,"variacao_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"codigo_barras"?: string | null,"codigo_fornecedor"?: string,"descricao_fornecedor"?: string,"fator"?: number,"fornecedor_id"?: string,"id"?: string,"unidade_fornecedor"?: string,"variacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fornecedor_itens_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fornecedor_itens_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"fornecedores": {
                  Row: {
                    "cnpj": string,"criado_em": string,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cnpj": string,"criado_em"?: string,"id"?: string,"nome": string
                  }
                  Update: {
                    "cnpj"?: string,"criado_em"?: string,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
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
      referencedRelation: "extrato_movimentacoes"
      referencedColumns: ["produto_id"]
    },{
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
                },"lotes": {
                  Row: {
                    "codigo": string,"criado_em": string,"id": string,"validade": string | null,"variacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"criado_em"?: string,"id"?: string,"validade"?: string | null,"variacao_id": string
                  }
                  Update: {
                    "codigo"?: string,"criado_em"?: string,"id"?: string,"validade"?: string | null,"variacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lotes_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"movimentacoes": {
                  Row: {
                    "aprovado_por": string | null,"criado_em": string,"estorno_de": number | null,"id": number,"lote_id": string,"motivo": string,"origem": string | null,"origem_id": string | null,"quantidade": number,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"usuario_id": string,"variacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aprovado_por"?: string | null,"criado_em"?: string,"estorno_de"?: number | null,"id"?: never,"lote_id": string,"motivo"?: string,"origem"?: string | null,"origem_id"?: string | null,"quantidade": number,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"usuario_id": string,"variacao_id": string
                  }
                  Update: {
                    "aprovado_por"?: string | null,"criado_em"?: string,"estorno_de"?: number | null,"id"?: never,"lote_id"?: string,"motivo"?: string,"origem"?: string | null,"origem_id"?: string | null,"quantidade"?: number,"tipo"?: Database["public"]['Enums']["tipo_movimentacao"],"usuario_id"?: string,"variacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimentacoes_estorno_de_fkey"
      columns: ["estorno_de"]
isOneToOne: true
      referencedRelation: "extrato_movimentacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_estorno_de_fkey"
      columns: ["estorno_de"]
isOneToOne: true
      referencedRelation: "movimentacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_lote_id_fkey"
      columns: ["lote_id"]
isOneToOne: false
      referencedRelation: "lotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"movimentacoes_custos": {
                  Row: {
                    "custo_unitario": number,"movimentacao_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "custo_unitario": number,"movimentacao_id": number
                  }
                  Update: {
                    "custo_unitario"?: number,"movimentacao_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimentacoes_custos_movimentacao_id_fkey"
      columns: ["movimentacao_id"]
isOneToOne: true
      referencedRelation: "extrato_movimentacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_custos_movimentacao_id_fkey"
      columns: ["movimentacao_id"]
isOneToOne: true
      referencedRelation: "movimentacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_entrada": {
                  Row: {
                    "caminho_xml": string,"chave_acesso": string,"confirmada_em": string | null,"confirmada_por": string | null,"emitida_em": string,"fornecedor_id": string,"id": string,"importada_em": string,"importada_por": string,"numero": string,"serie": string,"situacao": Database["public"]['Enums']["situacao_nota"]
                  }
                  ComputedFields: never
                  Insert: {
                    "caminho_xml": string,"chave_acesso": string,"confirmada_em"?: string | null,"confirmada_por"?: string | null,"emitida_em": string,"fornecedor_id": string,"id"?: string,"importada_em"?: string,"importada_por": string,"numero": string,"serie": string,"situacao": Database["public"]['Enums']["situacao_nota"]
                  }
                  Update: {
                    "caminho_xml"?: string,"chave_acesso"?: string,"confirmada_em"?: string | null,"confirmada_por"?: string | null,"emitida_em"?: string,"fornecedor_id"?: string,"id"?: string,"importada_em"?: string,"importada_por"?: string,"numero"?: string,"serie"?: string,"situacao"?: Database["public"]['Enums']["situacao_nota"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_entrada_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_entrada_item_lotes": {
                  Row: {
                    "codigo_lote": string | null,"id": string,"item_id": string,"quantidade_base": number,"validade": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo_lote"?: string | null,"id"?: string,"item_id": string,"quantidade_base": number,"validade"?: string | null
                  }
                  Update: {
                    "codigo_lote"?: string | null,"id"?: string,"item_id"?: string,"quantidade_base"?: number,"validade"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_entrada_item_lotes_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "notas_entrada_itens"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_entrada_itens": {
                  Row: {
                    "codigo_barras": string | null,"codigo_fornecedor": string,"descricao": string,"fator": number | null,"id": string,"ncm": string | null,"nota_id": string,"numero_item": number,"quantidade_base_nota": number | null,"quantidade_base_recebida": number | null,"quantidade_nota": number,"rastro": NonNullable<Json>,"unidade": string,"variacao_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo_barras"?: string | null,"codigo_fornecedor": string,"descricao": string,"fator"?: number | null,"id"?: string,"ncm"?: string | null,"nota_id": string,"numero_item": number,"quantidade_base_nota"?: number | null,"quantidade_base_recebida"?: number | null,"quantidade_nota": number,"rastro"?: NonNullable<Json>,"unidade": string,"variacao_id"?: string | null
                  }
                  Update: {
                    "codigo_barras"?: string | null,"codigo_fornecedor"?: string,"descricao"?: string,"fator"?: number | null,"id"?: string,"ncm"?: string | null,"nota_id"?: string,"numero_item"?: number,"quantidade_base_nota"?: number | null,"quantidade_base_recebida"?: number | null,"quantidade_nota"?: number,"rastro"?: NonNullable<Json>,"unidade"?: string,"variacao_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_entrada_itens_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "notas_entrada"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_entrada_itens_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_entrada_itens_valores": {
                  Row: {
                    "custo_total": number,"custo_unitario_base": number | null,"desconto": number,"frete": number,"icms_st": number,"ipi": number,"item_id": string,"outras_despesas": number,"seguro": number,"valor_produto": number
                  }
                  ComputedFields: never
                  Insert: {
                    "custo_total": number,"custo_unitario_base"?: number | null,"desconto"?: number,"frete"?: number,"icms_st"?: number,"ipi"?: number,"item_id": string,"outras_despesas"?: number,"seguro"?: number,"valor_produto"?: number
                  }
                  Update: {
                    "custo_total"?: number,"custo_unitario_base"?: number | null,"desconto"?: number,"frete"?: number,"icms_st"?: number,"ipi"?: number,"item_id"?: string,"outras_despesas"?: number,"seguro"?: number,"valor_produto"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_entrada_itens_valores_item_id_fkey"
      columns: ["item_id"]
isOneToOne: true
      referencedRelation: "notas_entrada_itens"
      referencedColumns: ["id"]
    }
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
      referencedRelation: "extrato_movimentacoes"
      referencedColumns: ["produto_id"]
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
      referencedRelation: "extrato_movimentacoes"
      referencedColumns: ["produto_id"]
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
                },"saldos": {
                  Row: {
                    "lote_id": string,"quantidade": number,"variacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "lote_id": string,"quantidade"?: number,"variacao_id": string
                  }
                  Update: {
                    "lote_id"?: string,"quantidade"?: number,"variacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saldos_lote_id_fkey"
      columns: ["lote_id"]
isOneToOne: true
      referencedRelation: "lotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saldos_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"solicitacoes_ajuste": {
                  Row: {
                    "decidido_em": string | null,"decidido_por": string | null,"id": number,"lote_id": string,"motivo": string,"quantidade": number,"situacao": Database["public"]['Enums']["situacao_solicitacao"],"solicitado_em": string,"solicitado_por": string,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"variacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "decidido_em"?: string | null,"decidido_por"?: string | null,"id"?: never,"lote_id": string,"motivo": string,"quantidade": number,"situacao"?: Database["public"]['Enums']["situacao_solicitacao"],"solicitado_em"?: string,"solicitado_por": string,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"variacao_id": string
                  }
                  Update: {
                    "decidido_em"?: string | null,"decidido_por"?: string | null,"id"?: never,"lote_id"?: string,"motivo"?: string,"quantidade"?: number,"situacao"?: Database["public"]['Enums']["situacao_solicitacao"],"solicitado_em"?: string,"solicitado_por"?: string,"tipo"?: Database["public"]['Enums']["tipo_movimentacao"],"variacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solicitacoes_ajuste_lote_id_fkey"
      columns: ["lote_id"]
isOneToOne: false
      referencedRelation: "lotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacoes_ajuste_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
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
      referencedRelation: "extrato_movimentacoes"
      referencedColumns: ["produto_id"]
    },{
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
                },"verificacoes_integridade": {
                  Row: {
                    "divergencias": NonNullable<Json>,"executada_em": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "divergencias"?: NonNullable<Json>,"executada_em"?: string,"id"?: never
                  }
                  Update: {
                    "divergencias"?: NonNullable<Json>,"executada_em"?: string,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "extrato_movimentacoes": {
                  Row: {
                    "aprovado_por_nome": string | null,"codigo_interno": string,"criado_em": string,"estornada": boolean | null,"estorno_de": number | null,"id": number,"lote": string | null,"lote_id": string,"motivo": string,"origem": string | null,"origem_id": string | null,"produto": string,"produto_id": string,"quantidade": number,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"tipo_venda": Database["public"]['Enums']["tipo_venda"],"usuario": string | null,"validade": string | null,"variacao": string,"variacao_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "movimentacoes_estorno_de_fkey"
      columns: ["estorno_de"]
isOneToOne: true
      referencedRelation: "extrato_movimentacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_estorno_de_fkey"
      columns: ["estorno_de"]
isOneToOne: true
      referencedRelation: "movimentacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_lote_id_fkey"
      columns: ["lote_id"]
isOneToOne: false
      referencedRelation: "lotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_variacao_id_fkey"
      columns: ["variacao_id"]
isOneToOne: false
      referencedRelation: "variacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"produtos_com_situacao": {
                  Row: {
                    "apto_alimento": boolean,"apto_forno": boolean,"apto_freezer": boolean,"apto_microondas": boolean,"atualizado_em": string,"cest": string | null,"controla_validade": boolean,"criado_em": string,"descricao": string,"id": string,"inativo": boolean,"ncm": string | null,"nome": string,"origem_fiscal": number | null,"pendencias": (string)[] | null,"situacao": string | null,"tipo_venda": Database["public"]['Enums']["tipo_venda"]
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "alertas_estoque":
{ Args: Record<PropertyKey, never>; Returns: {
              "codigo_interno": string,"dias_para_vencer": number,"estoque_minimo": number,"faixa_dias": number,"lote": string,"lote_id": string,"produto": string,"produto_id": string,"saldo": number,"tipo": string,"tipo_venda": Database["public"]['Enums']["tipo_venda"],"validade": string,"variacao": string,"variacao_id": string
            }[]
                           },
"alterar_categoria_em_massa":
{ Args: { "p_categoria": string,"p_incluir": boolean,"p_produtos": (string)[] }; Returns: number
                           },
"alterar_inativo_em_massa":
{ Args: { "p_inativo": boolean,"p_produtos": (string)[] }; Returns: number
                           },
"atualizar_produto":
{ Args: { "dados": Json,"p_produto": string }; Returns: undefined
                           },
"avisos_inicio":
{ Args: Record<PropertyKey, never>; Returns: {
              "abaixo_minimo": number,"conferencia_divergencias": number,"conferencia_em": string,"faixa_maior": number,"solicitacoes_pendentes": number,"vencendo": number,"vencidos": number
            }[]
                           },
"buscar_estoque":
{ Args: { "p_deslocamento"?: number,"p_limite"?: number,"p_so_com_saldo"?: boolean,"p_termo"?: string }; Returns: {
              "codigo_interno": string,"controla_validade": boolean,"estoque_minimo": number,"produto": string,"produto_id": string,"proxima_validade": string,"saldo_disponivel": number,"saldo_total": number,"tipo_venda": Database["public"]['Enums']["tipo_venda"],"total": number,"variacao": string,"variacao_id": string
            }[]
                           },
"buscar_produtos":
{ Args: { "p_categoria"?: string,"p_controla_validade"?: boolean,"p_deslocamento"?: number,"p_etiqueta"?: string,"p_limite"?: number,"p_situacao"?: string,"p_termo"?: string,"p_tipo_venda"?: Database["public"]['Enums']["tipo_venda"] }; Returns: {
              "id": string,"menor_preco_centavos": number,"nome": string,"situacao": string,"tipo_venda": Database["public"]['Enums']["tipo_venda"],"total": number,"variacoes": number
            }[]
                           },
"cnpj_valido":
{ Args: { "cnpj": string }; Returns: boolean
                           },
"conferir_integridade_estoque":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"criar_produto":
{ Args: { "dados": Json }; Returns: string
                           },
"decidir_solicitacao":
{ Args: { "p_aprovar": boolean,"p_solicitacao": number }; Returns: undefined
                           },
"eh_administrador":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"eh_usuario_ativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"entrar_no_estoque":
{ Args: { "p_codigo_lote": string,"p_custo_unitario": number,"p_motivo": string,"p_origem"?: string,"p_origem_id"?: string,"p_quantidade": number,"p_tipo": Database["public"]['Enums']["tipo_movimentacao"],"p_usuario": string,"p_validade": string,"p_variacao": string }; Returns: number
                           },
"estornar_movimentacao":
{ Args: { "p_motivo": string,"p_movimentacao": number }; Returns: number
                           },
"gerar_codigo_lote":
{ Args: { "p_prefixo": string,"p_variacao": string }; Returns: string
                           },
"gerar_grade":
{ Args: { "p_produto": string,"p_variacoes": Json }; Returns: number
                           },
"gtin_valido":
{ Args: { "codigo": string }; Returns: boolean
                           },
"hoje_sp":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"lote_geral":
{ Args: { "p_variacao": string }; Returns: string
                           },
"movimentar_lote":
{ Args: { "p_aprovado_por"?: string,"p_estorno_de"?: number,"p_lote": string,"p_motivo": string,"p_origem"?: string,"p_origem_id"?: string,"p_quantidade": number,"p_tipo": Database["public"]['Enums']["tipo_movimentacao"],"p_usuario": string }; Returns: number
                           },
"normalizar_codigo_interno":
{ Args: { "codigo": string }; Returns: string
                           },
"papel_atual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["papel_usuario"]
                           },
"proximo_codigo_interno":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"reajustar_precos":
{ Args: { "p_percentual": number,"p_produtos": (string)[] }; Returns: number
                           },
"registrar_entrada_manual":
{ Args: { "p_codigo_lote"?: string,"p_custo_unitario": number,"p_motivo": string,"p_quantidade": number,"p_validade"?: string,"p_variacao": string }; Returns: number
                           },
"registrar_perda_ou_ajuste":
{ Args: { "p_lote": string,"p_motivo": string,"p_quantidade": number,"p_tipo": Database["public"]['Enums']["tipo_movimentacao"],"p_variacao": string }; Returns: string
                           },
"retirar_fefo":
{ Args: { "p_motivo": string,"p_origem"?: string,"p_origem_id"?: string,"p_quantidade": number,"p_tipo": Database["public"]['Enums']["tipo_movimentacao"],"p_usuario": string,"p_variacao": string }; Returns: {
              "lote_id": string,"quantidade": number
            }[]
                           },
"travar_saldos":
{ Args: { "p_variacoes": (string)[] }; Returns: undefined
                           },
"validar_perda_ou_ajuste":
{ Args: { "p_lote": string,"p_motivo": string,"p_quantidade": number,"p_tipo": Database["public"]['Enums']["tipo_movimentacao"],"p_variacao": string }; Returns: string
                           },
"variacao_por_codigo":
{ Args: { "p_codigo": string }; Returns: string
                           }
          }
          Enums: {
            "papel_usuario": "administrador"|"funcionario","situacao_nota": "em_revisao"|"aguardando_administrador"|"confirmada"|"descartada","situacao_solicitacao": "pendente"|"aprovada"|"recusada","tipo_movimentacao": "entrada_nota"|"entrada_manual"|"ajuste_inventario"|"ajuste_manual"|"perda_vencimento"|"perda_avaria"|"quebra_pesagem"|"estorno","tipo_venda": "unidade"|"peso"
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
            "papel_usuario": ["administrador", "funcionario"],"situacao_nota": ["em_revisao", "aguardando_administrador", "confirmada", "descartada"],"situacao_solicitacao": ["pendente", "aprovada", "recusada"],"tipo_movimentacao": ["entrada_nota", "entrada_manual", "ajuste_inventario", "ajuste_manual", "perda_vencimento", "perda_avaria", "quebra_pesagem", "estorno"],"tipo_venda": ["unidade", "peso"]
          }
        }
} as const
