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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          id: string
          last_triggered_at: string | null
          rule_config: Json
          rule_type: string
          saved_search: Json
          user_id: string
          variant_id: string | null
          workspace_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_triggered_at?: string | null
          rule_config?: Json
          rule_type: string
          saved_search?: Json
          user_id: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_triggered_at?: string | null
          rule_config?: Json
          rule_type?: string
          saved_search?: Json
          user_id?: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          id: string
          name: string
          normalized_name: string
          website_url: string | null
        }
        Insert: {
          id?: string
          name: string
          normalized_name: string
          website_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          normalized_name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          attribute_schema: Json
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          attribute_schema?: Json
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          attribute_schema?: Json
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          active: boolean
          attribution_text: string | null
          base_url: string | null
          id: string
          is_live: boolean
          last_error_at: string | null
          last_error_text: string | null
          last_refreshed_at: string | null
          marketplace: string | null
          name: string
          refresh_interval_minutes: number | null
          refresh_policy: string | null
          snapshot_date: string | null
          source_type: Database["public"]["Enums"]["record_source_type"]
          terms_url: string | null
        }
        Insert: {
          active?: boolean
          attribution_text?: string | null
          base_url?: string | null
          id?: string
          is_live?: boolean
          last_error_at?: string | null
          last_error_text?: string | null
          last_refreshed_at?: string | null
          marketplace?: string | null
          name: string
          refresh_interval_minutes?: number | null
          refresh_policy?: string | null
          snapshot_date?: string | null
          source_type: Database["public"]["Enums"]["record_source_type"]
          terms_url?: string | null
        }
        Update: {
          active?: boolean
          attribution_text?: string | null
          base_url?: string | null
          id?: string
          is_live?: boolean
          last_error_at?: string | null
          last_error_text?: string | null
          last_refreshed_at?: string | null
          marketplace?: string | null
          name?: string
          refresh_interval_minutes?: number | null
          refresh_policy?: string | null
          snapshot_date?: string | null
          source_type?: Database["public"]["Enums"]["record_source_type"]
          terms_url?: string | null
        }
        Relationships: []
      }
      deal_evaluations: {
        Row: {
          assumptions: Json
          confidence: number | null
          created_at: string
          days_to_sell_estimate: number | null
          expected_sale_high: number | null
          expected_sale_low: number | null
          expected_sale_mid: number | null
          id: string
          input: Json
          label: string | null
          net_proceeds: number | null
          offer_id: string | null
          profit: number | null
          roi_pct: number | null
          score: number | null
          user_id: string
          variant_id: string | null
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          confidence?: number | null
          created_at?: string
          days_to_sell_estimate?: number | null
          expected_sale_high?: number | null
          expected_sale_low?: number | null
          expected_sale_mid?: number | null
          id?: string
          input?: Json
          label?: string | null
          net_proceeds?: number | null
          offer_id?: string | null
          profit?: number | null
          roi_pct?: number | null
          score?: number | null
          user_id: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          confidence?: number | null
          created_at?: string
          days_to_sell_estimate?: number | null
          expected_sale_high?: number | null
          expected_sale_low?: number | null
          expected_sale_mid?: number | null
          id?: string
          input?: Json
          label?: string | null
          net_proceeds?: number | null
          offer_id?: string | null
          profit?: number | null
          roi_pct?: number | null
          score?: number | null
          user_id?: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_evaluations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_evaluations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_evaluations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string
          id: string
          reason: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          reason: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          reason?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          acquired_at: string | null
          actual_profit: number | null
          condition_grade: string | null
          cost_basis: number | null
          created_at: string
          id: string
          listed_price: number | null
          quantity: number
          sold_at: string | null
          sold_price: number | null
          source_evaluation_id: string | null
          status: Database["public"]["Enums"]["pipeline_status"]
          storage_location: string | null
          title: string
          updated_at: string
          user_id: string
          variant_id: string | null
          workspace_id: string | null
        }
        Insert: {
          acquired_at?: string | null
          actual_profit?: number | null
          condition_grade?: string | null
          cost_basis?: number | null
          created_at?: string
          id?: string
          listed_price?: number | null
          quantity?: number
          sold_at?: string | null
          sold_price?: number | null
          source_evaluation_id?: string | null
          status?: Database["public"]["Enums"]["pipeline_status"]
          storage_location?: string | null
          title: string
          updated_at?: string
          user_id: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          acquired_at?: string | null
          actual_profit?: number | null
          condition_grade?: string | null
          cost_basis?: number | null
          created_at?: string
          id?: string
          listed_price?: number | null
          quantity?: number
          sold_at?: string | null
          sold_price?: number | null
          source_evaluation_id?: string | null
          status?: Database["public"]["Enums"]["pipeline_status"]
          storage_location?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_source_evaluation_id_fkey"
            columns: ["source_evaluation_id"]
            isOneToOne: false
            referencedRelation: "deal_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      market_snapshots: {
        Row: {
          active_listing_count: number
          completed_sale_count: number
          computed_at: string
          data_confidence: number
          days_to_sell_estimate: number | null
          high_sold_price: number | null
          id: string
          low_sold_price: number | null
          mean_sold_price: number | null
          median_sold_price: number | null
          period_end: string
          period_start: string
          region_code: string
          variant_id: string
        }
        Insert: {
          active_listing_count?: number
          completed_sale_count?: number
          computed_at?: string
          data_confidence?: number
          days_to_sell_estimate?: number | null
          high_sold_price?: number | null
          id?: string
          low_sold_price?: number | null
          mean_sold_price?: number | null
          median_sold_price?: number | null
          period_end: string
          period_start: string
          region_code?: string
          variant_id: string
        }
        Update: {
          active_listing_count?: number
          completed_sale_count?: number
          computed_at?: string
          data_confidence?: number
          days_to_sell_estimate?: number | null
          high_sold_price?: number | null
          id?: string
          low_sold_price?: number | null
          mean_sold_price?: number | null
          median_sold_price?: number | null
          period_end?: string
          period_start?: string
          region_code?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_snapshots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          availability: string
          condition_grade: string
          condition_notes: string | null
          currency_code: string
          data_source_id: string
          estimated_tax: number
          external_url: string | null
          id: string
          is_active: boolean
          item_price: number
          listed_at: string | null
          listing_url: string | null
          location_text: string | null
          match_confidence: number
          retrieved_at: string
          seller_name: string | null
          seller_rating: number | null
          shipping_price: number
          title: string
          variant_id: string | null
        }
        Insert: {
          availability?: string
          condition_grade?: string
          condition_notes?: string | null
          currency_code?: string
          data_source_id: string
          estimated_tax?: number
          external_url?: string | null
          id?: string
          is_active?: boolean
          item_price: number
          listed_at?: string | null
          listing_url?: string | null
          location_text?: string | null
          match_confidence?: number
          retrieved_at?: string
          seller_name?: string | null
          seller_rating?: number | null
          shipping_price?: number
          title: string
          variant_id?: string | null
        }
        Update: {
          availability?: string
          condition_grade?: string
          condition_notes?: string | null
          currency_code?: string
          data_source_id?: string
          estimated_tax?: number
          external_url?: string | null
          id?: string
          is_active?: boolean
          item_price?: number
          listed_at?: string | null
          listing_url?: string | null
          location_text?: string | null
          match_confidence?: number
          retrieved_at?: string
          seller_name?: string | null
          seller_rating?: number | null
          shipping_price?: number
          title?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          canonical_key: string
          gtin: string | null
          id: string
          image_url: string | null
          product_id: string
          sku_or_mpn: string | null
          title: string
        }
        Insert: {
          attributes?: Json
          canonical_key: string
          gtin?: string | null
          id?: string
          image_url?: string | null
          product_id: string
          sku_or_mpn?: string | null
          title: string
        }
        Update: {
          attributes?: Json
          canonical_key?: string
          gtin?: string | null
          id?: string
          image_url?: string | null
          product_id?: string
          sku_or_mpn?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          canonical_name: string
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          identity_confidence: number
          image_url: string | null
          slug: string
          specs: Json
        }
        Insert: {
          brand_id?: string | null
          canonical_name: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          identity_confidence?: number
          image_url?: string | null
          slug: string
          specs?: Json
        }
        Update: {
          brand_id?: string | null
          canonical_name?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          identity_confidence?: number
          image_url?: string | null
          slug?: string
          specs?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country_code: string
          created_at: string
          currency_code: string
          default_role: Database["public"]["Enums"]["role_mode"]
          display_name: string | null
          id: string
          onboarding_completed_at: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          currency_code?: string
          default_role?: Database["public"]["Enums"]["role_mode"]
          display_name?: string | null
          id: string
          onboarding_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          currency_code?: string
          default_role?: Database["public"]["Enums"]["role_mode"]
          display_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      research_evidence: {
        Row: {
          evidence_type: string | null
          excerpt: string | null
          id: string
          research_report_id: string
          retrieved_at: string | null
          supports_claim: string | null
          title: string | null
          url: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          evidence_type?: string | null
          excerpt?: string | null
          id?: string
          research_report_id: string
          retrieved_at?: string | null
          supports_claim?: string | null
          title?: string | null
          url?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          evidence_type?: string | null
          excerpt?: string | null
          id?: string
          research_report_id?: string
          retrieved_at?: string | null
          supports_claim?: string | null
          title?: string | null
          url?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_evidence_research_report_id_fkey"
            columns: ["research_report_id"]
            isOneToOne: false
            referencedRelation: "research_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_evidence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      research_reports: {
        Row: {
          answer_markdown: string | null
          created_at: string
          id: string
          model_name: string | null
          query: string
          role_mode: Database["public"]["Enums"]["role_mode"]
          structured_output: Json
          user_id: string
          variant_id: string | null
          workspace_id: string | null
        }
        Insert: {
          answer_markdown?: string | null
          created_at?: string
          id?: string
          model_name?: string | null
          query: string
          role_mode?: Database["public"]["Enums"]["role_mode"]
          structured_output?: Json
          user_id: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          answer_markdown?: string | null
          created_at?: string
          id?: string
          model_name?: string | null
          query?: string
          role_mode?: Database["public"]["Enums"]["role_mode"]
          structured_output?: Json
          user_id?: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_reports_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_comps: {
        Row: {
          condition_grade: string
          currency_code: string
          data_source_id: string
          id: string
          is_verified_completed_sale: boolean
          match_confidence: number
          sale_url: string | null
          shipping_paid: number
          sold_at: string
          sold_price: number
          title: string
          variant_id: string | null
        }
        Insert: {
          condition_grade?: string
          currency_code?: string
          data_source_id: string
          id?: string
          is_verified_completed_sale?: boolean
          match_confidence?: number
          sale_url?: string | null
          shipping_paid?: number
          sold_at: string
          sold_price: number
          title: string
          variant_id?: string | null
        }
        Update: {
          condition_grade?: string
          currency_code?: string
          data_source_id?: string
          id?: string
          is_verified_completed_sale?: boolean
          match_confidence?: number
          sale_url?: string | null
          shipping_paid?: number
          sold_at?: string
          sold_price?: number
          title?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_comps_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_comps_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          created_at: string
          id: string
          parsed_intent: Json
          raw_query: string
          role_mode: Database["public"]["Enums"]["role_mode"]
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parsed_intent?: Json
          raw_query: string
          role_mode?: Database["public"]["Enums"]["role_mode"]
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parsed_intent?: Json
          raw_query?: string
          role_mode?: Database["public"]["Enums"]["role_mode"]
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "searches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      source_refresh_runs: {
        Row: {
          data_source_id: string
          error_text: string | null
          finished_at: string | null
          id: string
          rows_upserted: number
          started_at: string
          status: string
        }
        Insert: {
          data_source_id: string
          error_text?: string | null
          finished_at?: string | null
          id?: string
          rows_upserted?: number
          started_at?: string
          status?: string
        }
        Update: {
          data_source_id?: string
          error_text?: string | null
          finished_at?: string | null
          id?: string
          rows_upserted?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_refresh_runs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_items: {
        Row: {
          created_at: string
          id: string
          note: string | null
          offer_id: string | null
          target_price: number | null
          user_id: string
          variant_id: string | null
          watchlist_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          offer_id?: string | null
          target_price?: number | null
          user_id: string
          variant_id?: string | null
          watchlist_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          offer_id?: string | null
          target_price?: number | null
          user_id?: string
          variant_id?: string | null
          watchlist_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          name: string
          role_mode: Database["public"]["Enums"]["role_mode"]
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          role_mode?: Database["public"]["Enums"]["role_mode"]
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role_mode?: Database["public"]["Enums"]["role_mode"]
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      current_plan: {
        Args: { _workspace_id: string }
        Returns: Database["public"]["Enums"]["plan_tier"]
      }
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["workspace_role"][]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id?: string
          _target_type?: string
          _workspace_id: string
        }
        Returns: string
      }
    }
    Enums: {
      pipeline_status:
        | "watch"
        | "researching"
        | "source_now"
        | "acquired"
        | "listed"
        | "sold"
        | "passed"
      plan_tier: "research" | "reseller" | "team"
      record_source_type:
        | "affiliate_api"
        | "partner_api"
        | "user_input"
        | "public_api"
        | "manual"
      role_mode: "buyer" | "reseller"
      workspace_role: "owner" | "admin" | "editor" | "auditor"
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
      pipeline_status: [
        "watch",
        "researching",
        "source_now",
        "acquired",
        "listed",
        "sold",
        "passed",
      ],
      plan_tier: ["research", "reseller", "team"],
      record_source_type: [
        "affiliate_api",
        "partner_api",
        "user_input",
        "public_api",
        "manual",
      ],
      role_mode: ["buyer", "reseller"],
      workspace_role: ["owner", "admin", "editor", "auditor"],
    },
  },
} as const
