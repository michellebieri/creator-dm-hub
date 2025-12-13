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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          activity_type: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      age_verifications: {
        Row: {
          created_at: string
          document_type: string | null
          id: string
          status: string
          user_id: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          id?: string
          status?: string
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string | null
          id?: string
          status?: string
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "age_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_replies: {
        Row: {
          created_at: string
          creator_id: string
          days_active: string[] | null
          id: string
          is_active: boolean
          message: string
          schedule_end: string | null
          schedule_start: string | null
          title: string
          trigger_condition: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          days_active?: string[] | null
          id?: string
          is_active?: boolean
          message: string
          schedule_end?: string | null
          schedule_start?: string | null
          title: string
          trigger_condition?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          days_active?: string[] | null
          id?: string
          is_active?: boolean
          message?: string
          schedule_end?: string | null
          schedule_start?: string | null
          title?: string
          trigger_condition?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_replies_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_contents: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          sort_order: number | null
          unlockable_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          sort_order?: number | null
          unlockable_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          sort_order?: number | null
          unlockable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_contents_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "content_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_contents_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          sort_order: number
          unlockable_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          sort_order?: number
          unlockable_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          unlockable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "content_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
        ]
      }
      content_bundles: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          messages_included: number | null
          original_price: number | null
          price: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          messages_included?: number | null
          original_price?: number | null
          price: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          messages_included?: number | null
          original_price?: number | null
          price?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_bundles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_collections: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_public: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_public?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_public?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_collections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          parent_comment_id: string | null
          unlockable_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          unlockable_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          unlockable_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "content_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_likes: {
        Row: {
          created_at: string | null
          id: string
          unlockable_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          unlockable_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          unlockable_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_likes_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tag_assignments: {
        Row: {
          created_at: string | null
          id: string
          tag_id: string
          unlockable_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_id: string
          unlockable_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_id?: string
          unlockable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "content_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tag_assignments_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      conversation_label_assignments: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          label_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          label_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_label_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "conversation_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_labels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          creator_id: string
          customer_id: string
          id: string
          status: Database["public"]["Enums"]["conversation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          customer_id: string
          id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          customer_id?: string
          id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_settings: {
        Row: {
          ai_messaging: boolean | null
          bulk_message_amount: number | null
          bulk_message_price: number | null
          created_at: string
          first_three_free: boolean | null
          gift_message_count: number | null
          gift_messages: boolean | null
          id: string
          is_accepting_messages: boolean
          price_per_message: number
          social_facebook: string | null
          social_instagram: string | null
          social_other_url: string | null
          social_snapchat: string | null
          social_tiktok: string | null
          social_twitch: string | null
          social_twitter: string | null
          social_youtube: string | null
          stripe_account_id: string | null
          updated_at: string
          user_id: string
          waitlist_status: Database["public"]["Enums"]["waitlist_status"]
          watermark_enabled: boolean | null
          watermark_text: string | null
          welcome_message_1: string | null
          welcome_message_2: string | null
          welcome_message_3: string | null
        }
        Insert: {
          ai_messaging?: boolean | null
          bulk_message_amount?: number | null
          bulk_message_price?: number | null
          created_at?: string
          first_three_free?: boolean | null
          gift_message_count?: number | null
          gift_messages?: boolean | null
          id?: string
          is_accepting_messages?: boolean
          price_per_message?: number
          social_facebook?: string | null
          social_instagram?: string | null
          social_other_url?: string | null
          social_snapchat?: string | null
          social_tiktok?: string | null
          social_twitch?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id: string
          waitlist_status?: Database["public"]["Enums"]["waitlist_status"]
          watermark_enabled?: boolean | null
          watermark_text?: string | null
          welcome_message_1?: string | null
          welcome_message_2?: string | null
          welcome_message_3?: string | null
        }
        Update: {
          ai_messaging?: boolean | null
          bulk_message_amount?: number | null
          bulk_message_price?: number | null
          created_at?: string
          first_three_free?: boolean | null
          gift_message_count?: number | null
          gift_messages?: boolean | null
          id?: string
          is_accepting_messages?: boolean
          price_per_message?: number
          social_facebook?: string | null
          social_instagram?: string | null
          social_other_url?: string | null
          social_snapchat?: string | null
          social_tiktok?: string | null
          social_twitch?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
          waitlist_status?: Database["public"]["Enums"]["waitlist_status"]
          watermark_enabled?: boolean | null
          watermark_text?: string | null
          welcome_message_1?: string | null
          welcome_message_2?: string | null
          welcome_message_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          id: string
          status: string
          stripe_subscription_id: string | null
          tier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          id?: string
          status?: string
          stripe_subscription_id?: string | null
          tier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          id?: string
          status?: string
          stripe_subscription_id?: string | null
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_verifications: {
        Row: {
          creator_id: string
          documents_url: string | null
          id: string
          rejection_reason: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          verified_at: string | null
        }
        Insert: {
          creator_id: string
          documents_url?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          verified_at?: string | null
        }
        Update: {
          creator_id?: string
          documents_url?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_verifications_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credits: {
        Row: {
          created_at: string
          creator_id: string
          credits_remaining: number
          customer_id: string
          id: string
          pack_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          credits_remaining?: number
          customer_id: string
          id?: string
          pack_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          credits_remaining?: number
          customer_id?: string
          id?: string
          pack_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "message_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          created_at: string
          creator_id: string
          criteria: Json
          customer_count: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          criteria: Json
          customer_count?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          criteria?: Json
          customer_count?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dmca_claims: {
        Row: {
          claimant_email: string
          claimant_name: string
          created_at: string
          description: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          unlockable_id: string
        }
        Insert: {
          claimant_email: string
          claimant_name: string
          created_at?: string
          description: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          unlockable_id: string
        }
        Update: {
          claimant_email?: string
          claimant_name?: string
          created_at?: string
          description?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          unlockable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dmca_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dmca_claims_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string | null
          id: string
          new_comment: boolean | null
          new_follower: boolean | null
          new_message: boolean | null
          new_purchase: boolean | null
          new_subscriber: boolean | null
          new_tip: boolean | null
          promotional: boolean | null
          updated_at: string | null
          user_id: string
          weekly_summary: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_comment?: boolean | null
          new_follower?: boolean | null
          new_message?: boolean | null
          new_purchase?: boolean | null
          new_subscriber?: boolean | null
          new_tip?: boolean | null
          promotional?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_summary?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          new_comment?: boolean | null
          new_follower?: boolean | null
          new_message?: boolean | null
          new_purchase?: boolean | null
          new_subscriber?: boolean | null
          new_tip?: boolean | null
          promotional?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_summary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_bookmarks: {
        Row: {
          created_at: string
          id: string
          message_id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_bookmarks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_packs: {
        Row: {
          created_at: string
          creator_id: string
          discount_percentage: number
          id: string
          is_active: boolean
          price: number
          quantity: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          price: number
          quantity: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_packs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          creator_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          creator_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          edit_count: number | null
          edited_at: string | null
          forwarded_from_id: string | null
          id: string
          is_forwarded: boolean
          is_paid: boolean
          is_pinned: boolean
          message_type: Database["public"]["Enums"]["message_type"]
          pinned_at: string | null
          pinned_by: string | null
          read_at: string | null
          read_by: string | null
          sender_id: string
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          edit_count?: number | null
          edited_at?: string | null
          forwarded_from_id?: string | null
          id?: string
          is_forwarded?: boolean
          is_paid?: boolean
          is_pinned?: boolean
          message_type?: Database["public"]["Enums"]["message_type"]
          pinned_at?: string | null
          pinned_by?: string | null
          read_at?: string | null
          read_by?: string | null
          sender_id: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          edit_count?: number | null
          edited_at?: string | null
          forwarded_from_id?: string | null
          id?: string
          is_forwarded?: boolean
          is_paid?: boolean
          is_pinned?: boolean
          message_type?: Database["public"]["Enums"]["message_type"]
          pinned_at?: string | null
          pinned_by?: string | null
          read_at?: string | null
          read_by?: string | null
          sender_id?: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forwarded_from_id_fkey"
            columns: ["forwarded_from_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string
          created_at: string | null
          exp_month: number
          exp_year: number
          id: string
          is_default: boolean | null
          last4: string
          stripe_payment_method_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string | null
          exp_month: number
          exp_year: number
          id?: string
          is_default?: boolean | null
          last4: string
          stripe_payment_method_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string | null
          exp_month?: number
          exp_year?: number
          id?: string
          is_default?: boolean | null
          last4?: string
          stripe_payment_method_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          creator_id: string
          id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          creator_id: string
          id?: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_experiments: {
        Row: {
          content_type: string
          created_at: string
          creator_id: string
          ended_at: string | null
          id: string
          status: string
          variant_a_conversions: number | null
          variant_a_price: number
          variant_a_views: number | null
          variant_b_conversions: number | null
          variant_b_price: number
          variant_b_views: number | null
          winner: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          creator_id: string
          ended_at?: string | null
          id?: string
          status?: string
          variant_a_conversions?: number | null
          variant_a_price: number
          variant_a_views?: number | null
          variant_b_conversions?: number | null
          variant_b_price: number
          variant_b_views?: number | null
          winner?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          creator_id?: string
          ended_at?: string | null
          id?: string
          status?: string
          variant_a_conversions?: number | null
          variant_a_price?: number
          variant_a_views?: number | null
          variant_b_conversions?: number | null
          variant_b_price?: number
          variant_b_views?: number | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_experiments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          created_at: string | null
          event_id: string
          event_type: string
          id: string
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_type: string
          id?: string
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          language_preference: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          theme_preference: string | null
          updated_at: string
          username: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          language_preference?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          theme_preference?: string | null
          updated_at?: string
          username: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          language_preference?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          theme_preference?: string | null
          updated_at?: string
          username?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          creator_id: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          creator_id: string
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          creator_id?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_campaigns: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          discount_percentage: number
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          target_segment: string | null
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          discount_percentage: number
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          target_segment?: string | null
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          discount_percentage?: number
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          target_segment?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          subscription: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          subscription: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          subscription?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          reward_paid: boolean
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          reward_paid?: boolean
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          reward_paid?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          reason: string | null
          status: string
          stripe_refund_id: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          error_message: string | null
          id: string
          message_type: string
          scheduled_at: string
          sender_id: string
          sent_at: string | null
          status: string
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_type?: string
          scheduled_at: string
          sender_id: string
          sent_at?: string | null
          status?: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_type?: string
          scheduled_at?: string
          sender_id?: string
          sent_at?: string | null
          status?: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_message_usage: {
        Row: {
          created_at: string
          creator_id: string
          customer_id: string
          id: string
          messages_allowed: number
          messages_used: number
          period_end: string
          period_start: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          customer_id: string
          id?: string
          messages_allowed?: number
          messages_used?: number
          period_end: string
          period_start: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          customer_id?: string
          id?: string
          messages_allowed?: number
          messages_used?: number
          period_end?: string
          period_start?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_message_usage_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_message_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_message_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "creator_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          billing_interval: string
          created_at: string
          creator_id: string
          description: string | null
          discount_comment: string | null
          discount_percentage: number | null
          features: Json | null
          free_messages_per_month: number | null
          id: string
          is_active: boolean
          name: string
          price: number
          stripe_price_id: string | null
          unlimited_messages: boolean | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          creator_id: string
          description?: string | null
          discount_comment?: string | null
          discount_percentage?: number | null
          features?: Json | null
          free_messages_per_month?: number | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          stripe_price_id?: string | null
          unlimited_messages?: boolean | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          discount_comment?: string | null
          discount_percentage?: number | null
          features?: Json | null
          free_messages_per_month?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          stripe_price_id?: string | null
          unlimited_messages?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_tiers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          message: string | null
          stripe_payment_id: string | null
          tipper_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          id?: string
          message?: string | null
          stripe_payment_id?: string | null
          tipper_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          message?: string | null
          stripe_payment_id?: string | null
          tipper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_tipper_id_fkey"
            columns: ["tipper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_sources: {
        Row: {
          campaign: string | null
          created_at: string
          id: string
          landing_page: string | null
          medium: string | null
          referrer: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          id?: string
          landing_page?: string | null
          medium?: string | null
          referrer?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          campaign?: string | null
          created_at?: string
          id?: string
          landing_page?: string | null
          medium?: string | null
          referrer?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traffic_sources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bundle_id: string | null
          created_at: string
          creator_id: string
          customer_id: string
          id: string
          message_id: string | null
          net_amount: number
          pack_id: string | null
          platform_fee: number
          processor_fee: number
          status: Database["public"]["Enums"]["transaction_status"]
          stripe_payment_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          bundle_id?: string | null
          created_at?: string
          creator_id: string
          customer_id: string
          id?: string
          message_id?: string | null
          net_amount: number
          pack_id?: string | null
          platform_fee?: number
          processor_fee?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          stripe_payment_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          bundle_id?: string | null
          created_at?: string
          creator_id?: string
          customer_id?: string
          id?: string
          message_id?: string | null
          net_amount?: number
          pack_id?: string | null
          platform_fee?: number
          processor_fee?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          stripe_payment_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "content_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "message_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      unlockables: {
        Row: {
          caption: string | null
          created_at: string
          creator_id: string
          expires_at: string | null
          free_for_subscribers: boolean | null
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string
          message_id: string
          price: number
          title: string | null
          unlocked_by: string[] | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          creator_id: string
          expires_at?: string | null
          free_for_subscribers?: boolean | null
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string
          message_id: string
          price: number
          title?: string | null
          unlocked_by?: string[] | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          free_for_subscribers?: boolean | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string
          message_id?: string
          price?: number
          title?: string | null
          unlocked_by?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "unlockables_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unlockables_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reported_message_id: string | null
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_message_id_fkey"
            columns: ["reported_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_name: string | null
          id: string
          ip_address: string | null
          last_active: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_pricing: {
        Row: {
          created_at: string
          creator_id: string
          custom_price_per_message: number | null
          custom_unlockable_discount: number | null
          customer_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          custom_price_per_message?: number | null
          custom_unlockable_discount?: number | null
          customer_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          custom_price_per_message?: number | null
          custom_unlockable_discount?: number | null
          customer_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_pricing_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_pricing_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          related_user_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          related_user_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          related_user_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          unlockable_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          unlockable_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          unlockable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_conversation_partner: {
        Args: { partner_id: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          username: string
        }[]
      }
      get_creator_pricing: {
        Args: { creator_id: string }
        Returns: {
          bulk_message_amount: number
          bulk_message_price: number
          first_three_free: boolean
          gift_message_count: number
          gift_messages: boolean
          is_accepting_messages: boolean
          price_per_message: number
          user_id: string
        }[]
      }
      get_public_creators: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          id: string
          username: string
        }[]
      }
      get_public_profile: {
        Args: { profile_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_creators: {
        Args: { search_query?: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          id: string
          username: string
        }[]
      }
      spend_wallet_balance: {
        Args: {
          p_amount: number
          p_description: string
          p_related_user_id?: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "creator" | "customer"
      conversation_status: "active" | "archived"
      media_type: "image" | "video" | "audio" | "document"
      message_type: "text" | "unlockable" | "voice"
      payout_status: "pending" | "processing" | "completed" | "failed"
      transaction_status: "pending" | "completed" | "failed" | "refunded"
      transaction_type: "message" | "pack" | "unlockable"
      user_role: "creator" | "customer"
      waitlist_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "creator", "customer"],
      conversation_status: ["active", "archived"],
      media_type: ["image", "video", "audio", "document"],
      message_type: ["text", "unlockable", "voice"],
      payout_status: ["pending", "processing", "completed", "failed"],
      transaction_status: ["pending", "completed", "failed", "refunded"],
      transaction_type: ["message", "pack", "unlockable"],
      user_role: ["creator", "customer"],
      waitlist_status: ["pending", "approved", "rejected"],
    },
  },
} as const
