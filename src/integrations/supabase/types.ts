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
      activity_events: {
        Row: {
          created_at: string
          id: string
          message: string
          session_id: string | null
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          session_id?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          session_id?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_email: string
          inviter_id: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_email: string
          inviter_id: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_email?: string
          inviter_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      gamification: {
        Row: {
          brain_heat: number
          brain_heat_updated_at: string
          created_at: string
          hint_tokens: number
          id: string
          last_active_date: string | null
          last_token_regen_at: string
          level: number
          max_hint_tokens: number
          streak_days: number
          streak_freezes: number
          total_hints_solved: number
          total_sessions_completed: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          brain_heat?: number
          brain_heat_updated_at?: string
          created_at?: string
          hint_tokens?: number
          id?: string
          last_active_date?: string | null
          last_token_regen_at?: string
          level?: number
          max_hint_tokens?: number
          streak_days?: number
          streak_freezes?: number
          total_hints_solved?: number
          total_sessions_completed?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          brain_heat?: number
          brain_heat_updated_at?: string
          created_at?: string
          hint_tokens?: number
          id?: string
          last_active_date?: string | null
          last_token_regen_at?: string
          level?: number
          max_hint_tokens?: number
          streak_days?: number
          streak_freezes?: number
          total_hints_solved?: number
          total_sessions_completed?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      hint_entries: {
        Row: {
          challenge: Json
          created_at: string
          hint_index: number
          id: string
          reasoning: string
          reasoning_eval: Json | null
          selected_index: number | null
          session_id: string
          submitted: boolean
          updated_at: string
          user_id: string
          was_correct: boolean | null
        }
        Insert: {
          challenge: Json
          created_at?: string
          hint_index: number
          id?: string
          reasoning?: string
          reasoning_eval?: Json | null
          selected_index?: number | null
          session_id: string
          submitted?: boolean
          updated_at?: string
          user_id: string
          was_correct?: boolean | null
        }
        Update: {
          challenge?: Json
          created_at?: string
          hint_index?: number
          id?: string
          reasoning?: string
          reasoning_eval?: Json | null
          selected_index?: number | null
          session_id?: string
          submitted?: boolean
          updated_at?: string
          user_id?: string
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hint_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_activity: string | null
          display_name: string | null
          id: string
          last_seen_at: string | null
          status_emoji: string | null
          status_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_activity?: string | null
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          status_emoji?: string | null
          status_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_activity?: string | null
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          status_emoji?: string | null
          status_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_nodes: {
        Row: {
          id: string
          mastery: number
          parent_topic: string | null
          times_practiced: number
          topic: string
          unlocked_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          mastery?: number
          parent_topic?: string | null
          times_practiced?: number
          topic: string
          unlocked_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          mastery?: number
          parent_topic?: string | null
          times_practiced?: number
          topic?: string
          unlocked_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          extra_file_name: string | null
          extra_file_url: string | null
          extra_summary: string | null
          final_answer: string | null
          final_correct: boolean | null
          final_feedback: string | null
          full_problem_text: string | null
          hints_used: number
          id: string
          problem_file_name: string | null
          problem_file_url: string | null
          problem_summary: string
          source_file_name: string | null
          source_file_url: string | null
          source_summary: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string
          total_hints_planned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          extra_file_name?: string | null
          extra_file_url?: string | null
          extra_summary?: string | null
          final_answer?: string | null
          final_correct?: boolean | null
          final_feedback?: string | null
          full_problem_text?: string | null
          hints_used?: number
          id?: string
          problem_file_name?: string | null
          problem_file_url?: string | null
          problem_summary?: string
          source_file_name?: string | null
          source_file_url?: string | null
          source_summary?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          total_hints_planned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          extra_file_name?: string | null
          extra_file_url?: string | null
          extra_summary?: string | null
          final_answer?: string | null
          final_correct?: boolean | null
          final_feedback?: string | null
          full_problem_text?: string | null
          hints_used?: number
          id?: string
          problem_file_name?: string | null
          problem_file_url?: string | null
          problem_summary?: string
          source_file_name?: string | null
          source_file_url?: string | null
          source_summary?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          total_hints_planned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { _friendship_id: string }
        Returns: boolean
      }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      decline_friend_request: {
        Args: { _friendship_id: string }
        Returns: boolean
      }
      heartbeat: { Args: never; Returns: undefined }
      list_friends: {
        Args: never
        Returns: {
          current_activity: string
          friend_name: string
          friend_user_id: string
          last_seen_at: string
          level: number
          presence: string
          since: string
          status_emoji: string
          status_message: string
          streak_days: number
        }[]
      }
      list_pending_friend_requests: {
        Args: never
        Returns: {
          created_at: string
          friendship_id: string
          requester_id: string
          requester_name: string
        }[]
      }
      send_friend_request_by_email: { Args: { _email: string }; Returns: Json }
      set_my_activity: { Args: { _activity: string }; Returns: undefined }
      update_my_status: {
        Args: { _emoji: string; _message: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_type:
        | "session_started"
        | "session_completed"
        | "hint_solved"
        | "streak_milestone"
      friendship_status: "pending" | "accepted" | "blocked"
      invite_status: "pending" | "accepted" | "expired"
      session_status: "active" | "completed" | "abandoned"
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
      activity_type: [
        "session_started",
        "session_completed",
        "hint_solved",
        "streak_milestone",
      ],
      friendship_status: ["pending", "accepted", "blocked"],
      invite_status: ["pending", "accepted", "expired"],
      session_status: ["active", "completed", "abandoned"],
    },
  },
} as const
