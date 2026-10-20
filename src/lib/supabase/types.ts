// Generated from the Supabase project schema. Do not edit by hand.
// Regenerate after every migration:
//   npm run db:types
//
// The generic helper types shipped by the generator are trimmed here to the
// `public` schema, which is the only one the client ever touches.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      courses: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_published: boolean;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_published?: boolean;
          slug: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_published?: boolean;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      modules: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          order_index: number;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          order_index: number;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          order_index?: number;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          bunny_video_id: string | null;
          created_at: string;
          description: string | null;
          duration_sec: number;
          id: string;
          materials: Json;
          module_id: string;
          order_index: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          bunny_video_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_sec: number;
          id?: string;
          materials?: Json;
          module_id: string;
          order_index: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          bunny_video_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_sec?: number;
          id?: string;
          materials?: Json;
          module_id?: string;
          order_index?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          lesson_id: string;
          position_sec: number;
          updated_at: string;
          user_id: string;
          watched_sec: number;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          lesson_id: string;
          position_sec?: number;
          updated_at?: string;
          user_id: string;
          watched_sec?: number;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          position_sec?: number;
          updated_at?: string;
          user_id?: string;
          watched_sec?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          admin_email: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          invite_token: string;
          invite_version: number;
          name: string;
          package_size: number;
          status: Database["public"]["Enums"]["org_status"];
          updated_at: string;
        };
        Insert: {
          admin_email?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          invite_token?: string;
          invite_version?: number;
          name: string;
          package_size: number;
          status?: Database["public"]["Enums"]["org_status"];
          updated_at?: string;
        };
        Update: {
          admin_email?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          invite_token?: string;
          invite_version?: number;
          name?: string;
          package_size?: number;
          status?: Database["public"]["Enums"]["org_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          joined_at: string;
          last_seen_at: string | null;
          organization_id: string | null;
          removed_at: string | null;
          role: Database["public"]["Enums"]["user_role"];
          status: Database["public"]["Enums"]["user_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          joined_at?: string;
          last_seen_at?: string | null;
          organization_id?: string | null;
          removed_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["user_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          joined_at?: string;
          last_seen_at?: string | null;
          organization_id?: string | null;
          removed_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["user_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      course_outline: {
        Args: { p_slug?: string };
        Returns: {
          completed: boolean;
          course_id: string;
          course_slug: string;
          course_title: string;
          duration_sec: number;
          has_video: boolean;
          lesson_id: string;
          lesson_order: number;
          lesson_title: string;
          module_id: string;
          module_order: number;
          module_title: string;
          watched_sec: number;
        }[];
      };
      save_lesson_progress: {
        Args: {
          p_delta_sec?: number;
          p_lesson_id: string;
          p_position_sec: number;
        };
        Returns: {
          out_completed: boolean;
          out_ok: boolean;
          out_reason: string;
          out_watched_sec: number;
        }[];
      };
      join_organization: {
        Args: { p_full_name: string; p_token: string };
        Returns: {
          out_ok: boolean;
          out_org_id: string;
          out_reason: string;
          out_role: Database["public"]["Enums"]["user_role"];
        }[];
      };
      lookup_invite: {
        Args: { p_token: string };
        Returns: {
          out_org_name: string;
          out_reason: string;
          out_seats_taken: number;
          out_seats_total: number;
          out_valid: boolean;
        }[];
      };
      org_overview: {
        Args: never;
        Returns: {
          cumulative_limit: number;
          cumulative_users: number;
          expires_at: string;
          id: string;
          invite_token: string;
          name: string;
          package_size: number;
          seats_left: number;
          seats_taken: number;
          status: Database["public"]["Enums"]["org_status"];
        }[];
      };
      regenerate_invite: {
        Args: never;
        Returns: {
          out_invite_token: string;
          out_ok: boolean;
          out_reason: string;
        }[];
      };
      release_seat: {
        Args: { p_user_id: string };
        Returns: { out_ok: boolean; out_reason: string }[];
      };
      su_provision_organization: {
        Args: {
          p_admin_email: string;
          p_months?: number;
          p_name: string;
          p_package_size: number;
        };
        Returns: {
          expires_at: string;
          id: string;
          invite_token: string;
          name: string;
        }[];
      };
    };
    Enums: {
      org_status: "trial" | "active" | "expired" | "suspended";
      user_role: "employee" | "org_admin" | "superadmin";
      user_status: "active" | "removed";
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];

export type FunctionReturns<T extends keyof PublicSchema["Functions"]> =
  PublicSchema["Functions"][T]["Returns"][number];
