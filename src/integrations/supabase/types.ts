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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_subcategories: {
        Row: {
          account_type: string
          created_at: string
          display_order: number
          id: string
          is_system: boolean
          name: string
          user_business_id: string
          user_id: string
        }
        Insert: {
          account_type: string
          created_at?: string
          display_order?: number
          id?: string
          is_system?: boolean
          name: string
          user_business_id: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          display_order?: number
          id?: string
          is_system?: boolean
          name?: string
          user_business_id?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_code: string | null
          account_number: string | null
          balance: number
          bank_name: string | null
          chart_account_id: string | null
          created_at: string
          currency: string | null
          current_balance: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          type: Database["public"]["Enums"]["bank_account_type"]
          user_business_id: string | null
          user_id: string
        }
        Insert: {
          account_code?: string | null
          account_number?: string | null
          balance?: number
          bank_name?: string | null
          chart_account_id?: string | null
          created_at?: string
          currency?: string | null
          current_balance?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          type?: Database["public"]["Enums"]["bank_account_type"]
          user_business_id?: string | null
          user_id: string
        }
        Update: {
          account_code?: string | null
          account_number?: string | null
          balance?: number
          bank_name?: string | null
          chart_account_id?: string | null
          created_at?: string
          currency?: string | null
          current_balance?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["bank_account_type"]
          user_business_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_user_business_id_fkey"
            columns: ["user_business_id"]
            isOneToOne: false
            referencedRelation: "user_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      business_plans: {
        Row: {
          content: Json
          created_at: string
          id: string
          title: string
          updated_at: string
          user_business_id: string | null
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_business_id?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_business_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_plans_user_business_id_fkey"
            columns: ["user_business_id"]
            isOneToOne: false
            referencedRelation: "user_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_template_steps: {
        Row: {
          description: string | null
          est_days: number | null
          id: string
          step_number: number
          template_id: string
          title: string
        }
        Insert: {
          description?: string | null
          est_days?: number | null
          id?: string
          step_number: number
          template_id: string
          title: string
        }
        Update: {
          description?: string | null
          est_days?: number | null
          id?: string
          step_number?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "business_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_templates: {
        Row: {
          category_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["business_difficulty"] | null
          id: string
          image_url: string | null
          monthly_profit_max: number | null
          monthly_profit_min: number | null
          name: string
          overview_content: string | null
          overview_pdf_url: string | null
          overview_video_url: string | null
          overview_web_url: string | null
          slug: string
          startup_cost_max: number | null
          startup_cost_min: number | null
          time_to_profit_months: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["business_difficulty"] | null
          id?: string
          image_url?: string | null
          monthly_profit_max?: number | null
          monthly_profit_min?: number | null
          name: string
          overview_content?: string | null
          overview_pdf_url?: string | null
          overview_video_url?: string | null
          overview_web_url?: string | null
          slug: string
          startup_cost_max?: number | null
          startup_cost_min?: number | null
          time_to_profit_months?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["business_difficulty"] | null
          id?: string
          image_url?: string | null
          monthly_profit_max?: number | null
          monthly_profit_min?: number | null
          name?: string
          overview_content?: string | null
          overview_pdf_url?: string | null
          overview_video_url?: string | null
          overview_web_url?: string | null
          slug?: string
          startup_cost_max?: number | null
          startup_cost_min?: number | null
          time_to_profit_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_personal: boolean
          name: string
          subcategory: string | null
          type: Database["public"]["Enums"]["account_type"]
          user_business_id: string | null
          user_id: string
        }
        Insert: {
          account_type?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_personal?: boolean
          name: string
          subcategory?: string | null
          type: Database["public"]["Enums"]["account_type"]
          user_business_id?: string | null
          user_id: string
        }
        Update: {
          account_type?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_personal?: boolean
          name?: string
          subcategory?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          user_business_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_user_business_id_fkey"
            columns: ["user_business_id"]
            isOneToOne: false
            referencedRelation: "user_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          type: Database["public"]["Enums"]["contact_type"]
          user_business_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          type: Database["public"]["Enums"]["contact_type"]
          user_business_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["contact_type"]
          user_business_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_business_id_fkey"
            columns: ["user_business_id"]
            isOneToOne: false
            referencedRelation: "user_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      country_authorities: {
        Row: {
          authority_name: string
          authority_website: string | null
          country_code: string
          country_name: string
          created_at: string
          id: number
        }
        Insert: {
          authority_name: string
          authority_website?: string | null
          country_code: string
          country_name: string
          created_at?: string
          id?: number
        }
        Update: {
          authority_name?: string
          authority_website?: string | null
          country_code?: string
          country_name?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          customer_name: string
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          user_business_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          user_business_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          user_business_id?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          description: string | null
          entry_date: string
          id: string
          is_posted: boolean
          reference: string | null
          updated_at: string
          user_business_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          is_posted?: boolean
          reference?: string | null
          updated_at?: string
          user_business_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          is_posted?: boolean
          reference?: string | null
          updated_at?: string
          user_business_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_user_business_id_fkey"
            columns: ["user_business_id"]
            isOneToOne: false
            referencedRelation: "user_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          credit: number
          customer_id: string | null
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
          memo: string | null
          tax_amount: number
          transaction_type: string | null
          vendor_id: string | null
        }
        Insert: {
          account_id: string
          credit?: number
          customer_id?: string | null
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          memo?: string | null
          tax_amount?: number
          transaction_type?: string | null
          vendor_id?: string | null
        }
        Update: {
          account_id?: string
          credit?: number
          customer_id?: string | null
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          memo?: string | null
          tax_amount?: number
          transaction_type?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lenders: {
        Row: {
          country: string
          created_at: string
          description: string | null
          id: string
          interest_rate_max: number | null
          interest_rate_min: number | null
          logo_url: string | null
          max_loan: number | null
          min_loan: number | null
          name: string
          requirements: string | null
          type: Database["public"]["Enums"]["lender_type"]
          website: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          interest_rate_max?: number | null
          interest_rate_min?: number | null
          logo_url?: string | null
          max_loan?: number | null
          min_loan?: number | null
          name: string
          requirements?: string | null
          type?: Database["public"]["Enums"]["lender_type"]
          website?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          interest_rate_max?: number | null
          interest_rate_min?: number | null
          logo_url?: string | null
          max_loan?: number | null
          min_loan?: number | null
          name?: string
          requirements?: string | null
          type?: Database["public"]["Enums"]["lender_type"]
          website?: string | null
        }
        Relationships: []
      }
      personal_budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          limit_amount: number
          month: number
          user_id: string
          year: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          limit_amount: number
          month: number
          user_id: string
          year: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          limit_amount?: number
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      personal_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_income: {
        Row: {
          amount: number
          created_at: string
          frequency: string
          id: string
          month: number
          source: string
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          created_at?: string
          frequency: string
          id?: string
          month: number
          source: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          frequency?: string
          id?: string
          month?: number
          source?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      personal_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          transaction_date: string
          type: Database["public"]["Enums"]["personal_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type: Database["public"]["Enums"]["personal_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type?: Database["public"]["Enums"]["personal_tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          completed_onboarding: boolean
          country: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          completed_onboarding?: boolean
          country?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          completed_onboarding?: boolean
          country?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regulatory_authorities: {
        Row: {
          category: string | null
          country: string
          created_at: string
          description: string | null
          id: string
          name: string
          website: string | null
        }
        Insert: {
          category?: string | null
          country: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          website?: string | null
        }
        Update: {
          category?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          id: string
          month: number | null
          name: string
          target_amount: number
          target_date: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          month?: number | null
          name: string
          target_amount: number
          target_date?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          month?: number | null
          name?: string
          target_amount?: number
          target_date?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      step_progress: {
        Row: {
          checklist_status: Json
          completed: boolean
          completed_at: string | null
          created_at: string
          id: number
          notes: string | null
          step_number: number
          step_title: string | null
          updated_at: string
          user_business_id: string
        }
        Insert: {
          checklist_status?: Json
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: number
          notes?: string | null
          step_number: number
          step_title?: string | null
          updated_at?: string
          user_business_id: string
        }
        Update: {
          checklist_status?: Json
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: number
          notes?: string | null
          step_number?: number
          step_title?: string | null
          updated_at?: string
          user_business_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_progress_user_business_id_fkey"
            columns: ["user_business_id"]
            isOneToOne: false
            referencedRelation: "user_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_businesses: {
        Row: {
          budget: number
          created_at: string
          currency: string | null
          description: string | null
          expected_monthly_profit: number | null
          id: string
          name: string
          start_date: string | null
          started_at: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          budget?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_monthly_profit?: number | null
          id?: string
          name: string
          start_date?: string | null
          started_at?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          budget?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_monthly_profit?: number | null
          id?: string
          name?: string
          start_date?: string | null
          started_at?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_businesses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "business_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roadmap_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          notes: string | null
          step_id: string
          user_business_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          notes?: string | null
          step_id: string
          user_business_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          notes?: string | null
          step_id?: string
          user_business_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roadmap_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "business_template_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roadmap_progress_user_business_id_fkey"
            columns: ["user_business_id"]
            isOneToOne: false
            referencedRelation: "user_businesses"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          user_business_id: string
          user_id: string
          vendor_name: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          user_business_id: string
          user_id: string
          vendor_name: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          user_business_id?: string
          user_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
      wallet_budgets: {
        Row: {
          amount_planned: number
          category: string
          created_at: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount_planned: number
          category: string
          created_at?: string
          id?: string
          month: string
          user_id: string
        }
        Update: {
          amount_planned?: number
          category?: string
          created_at?: string
          id?: string
          month?: string
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
      seed_default_expense_categories: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type:
        | "asset"
        | "liability"
        | "equity"
        | "income"
        | "expense"
        | "cogs"
        | "other_income"
        | "other_expense"
      app_role: "admin" | "user"
      bank_account_type: "checking" | "savings" | "mobile_money" | "cash"
      business_difficulty: "easy" | "medium" | "hard"
      contact_type: "vendor" | "customer"
      lender_type: "bank" | "microfinance" | "sacco" | "digital" | "government"
      personal_tx_type: "income" | "expense"
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
      account_type: [
        "asset",
        "liability",
        "equity",
        "income",
        "expense",
        "cogs",
        "other_income",
        "other_expense",
      ],
      app_role: ["admin", "user"],
      bank_account_type: ["checking", "savings", "mobile_money", "cash"],
      business_difficulty: ["easy", "medium", "hard"],
      contact_type: ["vendor", "customer"],
      lender_type: ["bank", "microfinance", "sacco", "digital", "government"],
      personal_tx_type: ["income", "expense"],
    },
  },
} as const
