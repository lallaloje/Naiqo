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
      analyses: {
        Row: {
          client_name: string | null
          created_at: string
          diagnosis: string | null
          id: string
          image_url: string | null
          notes: string | null
          salon_id: string | null
          user_id: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          salon_id?: string | null
          user_id: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          salon_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          center_id: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          end_time: string | null
          id: string
          notes: string | null
          salon_id: string | null
          service: string | null
          service_id: string | null
          source: string | null
          staff_id: string | null
          start_time: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          center_id?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          salon_id?: string | null
          service?: string | null
          service_id?: string | null
          source?: string | null
          staff_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          center_id?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          salon_id?: string | null
          service?: string | null
          service_id?: string | null
          source?: string | null
          staff_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      center_owners: {
        Row: {
          center_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          center_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          center_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_owners_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      image_annotations: {
        Row: {
          annotation_data: Json | null
          annotation_type: string
          annotator_id: string | null
          created_at: string
          id: string
          image_id: string
        }
        Insert: {
          annotation_data?: Json | null
          annotation_type: string
          annotator_id?: string | null
          created_at?: string
          id?: string
          image_id: string
        }
        Update: {
          annotation_data?: Json | null
          annotation_type?: string
          annotator_id?: string | null
          created_at?: string
          id?: string
          image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_annotations_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "nail_images"
            referencedColumns: ["id"]
          },
        ]
      }
      nail_analysis: {
        Row: {
          conditions_detected: Json | null
          confidence: number | null
          created_at: string
          diagnosis: string | null
          id: string
          image_hash: string | null
          image_url: string | null
          notes: string | null
          recommendations: string | null
          user_id: string
        }
        Insert: {
          conditions_detected?: Json | null
          confidence?: number | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          image_hash?: string | null
          image_url?: string | null
          notes?: string | null
          recommendations?: string | null
          user_id: string
        }
        Update: {
          conditions_detected?: Json | null
          confidence?: number | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          image_hash?: string | null
          image_url?: string | null
          notes?: string | null
          recommendations?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nail_conditions: {
        Row: {
          aad_url: string | null
          category: string | null
          causes: string[] | null
          clinical_signs: string | null
          created_at: string
          dermnet_url: string | null
          differential_diagnosis: string[] | null
          full_description: string | null
          id: string
          image_url: string | null
          name: string
          prevention: string[] | null
          pubmed_refs: string[] | null
          recommended_tests: string[] | null
          severity: string | null
          short_definition: string | null
          symptoms: string[] | null
          synonyms: string[] | null
          treatment_summary: string | null
          treatments: string[] | null
        }
        Insert: {
          aad_url?: string | null
          category?: string | null
          causes?: string[] | null
          clinical_signs?: string | null
          created_at?: string
          dermnet_url?: string | null
          differential_diagnosis?: string[] | null
          full_description?: string | null
          id?: string
          image_url?: string | null
          name: string
          prevention?: string[] | null
          pubmed_refs?: string[] | null
          recommended_tests?: string[] | null
          severity?: string | null
          short_definition?: string | null
          symptoms?: string[] | null
          synonyms?: string[] | null
          treatment_summary?: string | null
          treatments?: string[] | null
        }
        Update: {
          aad_url?: string | null
          category?: string | null
          causes?: string[] | null
          clinical_signs?: string | null
          created_at?: string
          dermnet_url?: string | null
          differential_diagnosis?: string[] | null
          full_description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          prevention?: string[] | null
          pubmed_refs?: string[] | null
          recommended_tests?: string[] | null
          severity?: string | null
          short_definition?: string | null
          symptoms?: string[] | null
          synonyms?: string[] | null
          treatment_summary?: string | null
          treatments?: string[] | null
        }
        Relationships: []
      }
      nail_images: {
        Row: {
          age_range: string | null
          attribution: string | null
          clinical_consent: boolean
          condition_id: string | null
          consent_timestamp: string | null
          consent_version: string | null
          deleted_at: string | null
          finger: string | null
          gdpr_consent: boolean
          has_dermatoscopy: boolean
          id: string
          is_anonymized: boolean
          lab_result: string | null
          ml_consent: boolean
          quality_score: number | null
          reported_issues: number
          resolution: string | null
          skin_tone: string | null
          source: string
          storage_path: string
          thumbnail_path: string | null
          uploaded_at: string
          uploaded_by: string | null
          usage_rights: string
        }
        Insert: {
          age_range?: string | null
          attribution?: string | null
          clinical_consent?: boolean
          condition_id?: string | null
          consent_timestamp?: string | null
          consent_version?: string | null
          deleted_at?: string | null
          finger?: string | null
          gdpr_consent?: boolean
          has_dermatoscopy?: boolean
          id?: string
          is_anonymized?: boolean
          lab_result?: string | null
          ml_consent?: boolean
          quality_score?: number | null
          reported_issues?: number
          resolution?: string | null
          skin_tone?: string | null
          source?: string
          storage_path: string
          thumbnail_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          usage_rights?: string
        }
        Update: {
          age_range?: string | null
          attribution?: string | null
          clinical_consent?: boolean
          condition_id?: string | null
          consent_timestamp?: string | null
          consent_version?: string | null
          deleted_at?: string | null
          finger?: string | null
          gdpr_consent?: boolean
          has_dermatoscopy?: boolean
          id?: string
          is_anonymized?: boolean
          lab_result?: string | null
          ml_consent?: boolean
          quality_score?: number | null
          reported_issues?: number
          resolution?: string | null
          skin_tone?: string | null
          source?: string
          storage_path?: string
          thumbnail_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          usage_rights?: string
        }
        Relationships: [
          {
            foreignKeyName: "nail_images_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "nail_conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          analytics_consent: boolean
          created_at: string
          data_sharing_consent: boolean
          id: string
          marketing_consent: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_consent?: boolean
          created_at?: string
          data_sharing_consent?: boolean
          id?: string
          marketing_consent?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_consent?: boolean
          created_at?: string
          data_sharing_consent?: boolean
          id?: string
          marketing_consent?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salons: {
        Row: {
          address: string | null
          city: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          onboarding_completed: boolean
          onboarding_data: Json | null
          phone: string | null
          postal_code: string | null
          salon_name: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan: string | null
          subscription_status: string
          trial_ends_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          onboarding_completed?: boolean
          onboarding_data?: Json | null
          phone?: string | null
          postal_code?: string | null
          salon_name?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          onboarding_completed?: boolean
          onboarding_data?: Json | null
          phone?: string | null
          postal_code?: string | null
          salon_name?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          buffer_after: number
          buffer_before: number
          center_id: string | null
          salon_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price: number | null
        }
        Insert: {
          active?: boolean
          buffer_after?: number
          buffer_before?: number
          center_id?: string | null
          salon_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          price?: number | null
        }
        Update: {
          active?: boolean
          buffer_after?: number
          buffer_before?: number
          center_id?: string | null
          salon_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_recommendations: {
        Row: {
          analysis_id: string | null
          created_at: string
          id: string
          notes: string | null
          recommendations: Json
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recommendations?: Json
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recommendations?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "nail_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_stats: {
        Row: {
          analyses_count: number
          appointments_count: number
          created_at: string
          id: string
          month: string
          salon_id: string
          updated_at: string
        }
        Insert: {
          analyses_count?: number
          appointments_count?: number
          created_at?: string
          id?: string
          month: string
          salon_id: string
          updated_at?: string
        }
        Update: {
          analyses_count?: number
          appointments_count?: number
          created_at?: string
          id?: string
          month?: string
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_stats_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
