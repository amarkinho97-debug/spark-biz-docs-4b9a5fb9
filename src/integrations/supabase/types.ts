export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_settings: {
        Row: {
          created_at: string
          email: string | null
          email_enabled: boolean
          id: string
          updated_at: string
          user_id: string
          webhook_enabled: boolean
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
          webhook_enabled?: boolean
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          email_enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          webhook_enabled?: boolean
          webhook_url?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          action: string
          anonymous_id: string | null
          category: string
          created_at: string
          id: string
          label: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          anonymous_id?: string | null
          category: string
          created_at?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          anonymous_id?: string | null
          category?: string
          created_at?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          invoice_id: string
          message: string | null
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          invoice_id: string
          message?: string | null
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          invoice_id?: string
          message?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          affected_contracts: Json | null
          alert_sent: boolean
          alert_timestamp: string | null
          created_at: string
          error_message: string | null
          execution_date: string
          id: string
          invoices_created_count: number
          status: string
          user_id: string
        }
        Insert: {
          affected_contracts?: Json | null
          alert_sent?: boolean
          alert_timestamp?: string | null
          created_at?: string
          error_message?: string | null
          execution_date: string
          id?: string
          invoices_created_count?: number
          status: string
          user_id: string
        }
        Update: {
          affected_contracts?: Json | null
          alert_sent?: boolean
          alert_timestamp?: string | null
          created_at?: string
          error_message?: string | null
          execution_date?: string
          id?: string
          invoices_created_count?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          razao_social: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          razao_social: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          razao_social?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          data_emissao: string
          descricao_servico: string
          discount_unconditional: number | null
          error_message: string | null
          external_id: string | null
          external_pdf_url: string | null
          id: string
          numero_nota: string | null
          operation_nature: string | null
          protocol_number: string | null
          recurring_contract_id: string | null
          retention_codes: Json | null
          service_location_code: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          user_id: string
          valor: number
          xml_content: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          data_emissao?: string
          descricao_servico: string
          discount_unconditional?: number | null
          error_message?: string | null
          external_id?: string | null
          external_pdf_url?: string | null
          id?: string
          numero_nota?: string | null
          operation_nature?: string | null
          protocol_number?: string | null
          recurring_contract_id?: string | null
          retention_codes?: Json | null
          service_location_code?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id: string
          valor: number
          xml_content?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          data_emissao?: string
          descricao_servico?: string
          discount_unconditional?: number | null
          error_message?: string | null
          external_id?: string | null
          external_pdf_url?: string | null
          id?: string
          numero_nota?: string | null
          operation_nature?: string | null
          protocol_number?: string | null
          recurring_contract_id?: string | null
          retention_codes?: Json | null
          service_location_code?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id?: string
          valor?: number
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_recurring_contract_id_fkey"
            columns: ["recurring_contract_id"]
            isOneToOne: false
            referencedRelation: "recurring_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      nbs_codes: {
        Row: {
          category: string | null
          code: string
          description: string
        }
        Insert: {
          category?: string | null
          code: string
          description: string
        }
        Update: {
          category?: string | null
          code?: string
          description?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          consents: Json | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          endereco_fiscal: string | null
          estado: string | null
          first_name: string | null
          ibge_cidade: string | null
          id: string
          inscricao_municipal: string | null
          last_name: string | null
          logo_url: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string | null
          regime_tributario: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          consents?: Json | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          endereco_fiscal?: string | null
          estado?: string | null
          first_name?: string | null
          ibge_cidade?: string | null
          id: string
          inscricao_municipal?: string | null
          last_name?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          consents?: Json | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          endereco_fiscal?: string | null
          estado?: string | null
          first_name?: string | null
          ibge_cidade?: string | null
          id?: string
          inscricao_municipal?: string | null
          last_name?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurring_contracts: {
        Row: {
          amount: number
          auto_issue: boolean
          charge_day: number
          client_id: string
          contract_name: string
          created_at: string
          id: string
          is_vip: boolean
          service_description: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_issue?: boolean
          charge_day: number
          client_id: string
          contract_name: string
          created_at?: string
          id?: string
          is_vip?: boolean
          service_description: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_issue?: boolean
          charge_day?: number
          client_id?: string
          contract_name?: string
          created_at?: string
          id?: string
          is_vip?: boolean
          service_description?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_service_codes: {
        Row: {
          code_lc116: string
          code_nbs: string | null
          created_at: string
          description: string
          id: string
          keywords: string | null
        }
        Insert: {
          code_lc116: string
          code_nbs?: string | null
          created_at?: string
          description: string
          id?: string
          keywords?: string | null
        }
        Update: {
          code_lc116?: string
          code_nbs?: string | null
          created_at?: string
          description?: string
          id?: string
          keywords?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      invoice_status: "draft" | "issued" | "processing" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      invoice_status: ["draft", "issued", "processing", "cancelled"],
    },
  },
} as const
