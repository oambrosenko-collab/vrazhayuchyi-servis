// Generated from the Supabase project schema. Do not edit by hand.
// Regenerate after every migration:
//   npm run db:types
//
// The webinar tables, enum and functions below were written by hand: the
// Supabase CLI is not installed on this machine, so the generator could
// not be run after the webinars migration. Regenerate when it is, and
// this note goes away with the diff.
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
      view_invites: {
        Row: {
          created_at: string;
          token: string;
        };
        Insert: {
          created_at?: string;
          token?: string;
        };
        Update: {
          created_at?: string;
          token?: string;
        };
        Relationships: [];
      };
      webinars: {
        Row: {
          created_at: string;
          description: string | null;
          duration_min: number;
          id: string;
          is_published: boolean;
          join_url: string | null;
          recording_url: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration_min?: number;
          id?: string;
          is_published?: boolean;
          join_url?: string | null;
          recording_url?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration_min?: number;
          id?: string;
          is_published?: boolean;
          join_url?: string | null;
          recording_url?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webinar_touches: {
        Row: {
          created_at: string;
          id: string;
          source: Database["public"]["Enums"]["webinar_touch"];
          user_id: string;
          webinar_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          source: Database["public"]["Enums"]["webinar_touch"];
          user_id: string;
          webinar_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          source?: Database["public"]["Enums"]["webinar_touch"];
          user_id?: string;
          webinar_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webinar_touches_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: false;
            referencedRelation: "webinars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webinar_touches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
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
      course_quizzes: {
        Args: never;
        Returns: {
          quiz_id: string;
          module_id: string | null;
          title: string;
          pass_score: number;
          is_final: boolean;
          question_count: number;
          best_score: number;
          passed: boolean;
          attempts: number;
        }[];
      };
      quiz_sheet: {
        Args: { p_quiz_id: string };
        Returns: {
          quiz_title: string;
          pass_score: number;
          question_id: string;
          prompt: string;
          question_order: number;
          option_id: string;
          label: string;
          option_order: number;
        }[];
      };
      submit_quiz_attempt: {
        Args: { p_quiz_id: string; p_answers: Json };
        Returns: {
          out_ok: boolean;
          out_reason: string;
          out_score: number;
          out_passed: boolean;
          out_correct: number;
          out_total: number;
          out_weak_topics: string[] | null;
        }[];
      };
      certificate_status: {
        Args: never;
        Returns: {
          lessons_done: number;
          lessons_total: number;
          quizzes_passed: number;
          quizzes_total: number;
          eligible: boolean;
          number: string | null;
          issued_at: string | null;
          full_name: string | null;
          org_name: string | null;
          course_title: string;
        }[];
      };
      issue_certificate: {
        Args: never;
        Returns: {
          out_ok: boolean;
          out_reason: string;
          out_number: string | null;
        }[];
      };
      webinar_feed: {
        Args: never;
        Returns: {
          webinar_id: string;
          title: string;
          description: string | null;
          starts_at: string;
          duration_min: number;
          join_url: string | null;
          recording_url: string | null;
          is_upcoming: boolean;
          joined_live: boolean;
          opened_recording: boolean;
        }[];
      };
      next_webinar: {
        Args: never;
        Returns: {
          webinar_id: string;
          title: string;
          description: string | null;
          starts_at: string;
          duration_min: number;
          join_url: string | null;
          recording_url: string | null;
          is_upcoming: boolean;
          joined_live: boolean;
          opened_recording: boolean;
        }[];
      };
      record_webinar_touch: {
        Args: {
          p_webinar: string;
          p_source: Database["public"]["Enums"]["webinar_touch"];
        };
        Returns: { out_ok: boolean; out_reason: string }[];
      };
      su_webinars: {
        Args: never;
        Returns: {
          webinar_id: string;
          title: string;
          description: string | null;
          starts_at: string;
          duration_min: number;
          join_url: string | null;
          recording_url: string | null;
          is_published: boolean;
          touched_live: number;
          touched_recording: number;
        }[];
      };
      su_save_webinar: {
        Args: {
          p_id: string | null;
          p_title: string;
          p_description: string | null;
          p_starts_at: string;
          p_duration_min: number;
          p_join_url: string | null;
          p_recording_url: string | null;
          p_published: boolean;
        };
        Returns: { out_ok: boolean; out_id: string | null }[];
      };
      su_delete_webinar: {
        Args: { p_id: string };
        Returns: { out_ok: boolean }[];
      };
      team_report: {
        Args: never;
        Returns: {
          user_id: string;
          full_name: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          status: Database["public"]["Enums"]["user_status"];
          joined_at: string;
          removed_at: string | null;
          last_seen_at: string | null;
          lessons_done: number;
          lessons_total: number;
          percent: number;
          webinars_touched: number;
          webinars_held: number;
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
      claim_view_access: {
        Args: { p_full_name: string; p_token: string };
        Returns: {
          out_ok: boolean;
          out_reason: string;
          out_role: Database["public"]["Enums"]["user_role"];
        }[];
      };
      lookup_view_invite: {
        Args: { p_token: string };
        Returns: { out_valid: boolean }[];
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
      su_overview: {
        Args: never;
        Returns: {
          organizations_total: number;
          organizations_active: number;
          seats_sold: number;
          seats_taken: number;
          learners_active: number;
          learners_finished: number;
          avg_percent: number;
          certificates_issued: number;
          lessons_total: number;
          quizzes_total: number;
        }[];
      };
      su_organizations: {
        Args: never;
        Returns: {
          id: string;
          name: string;
          admin_email: string | null;
          package_size: number;
          seats_taken: number;
          activation: number;
          avg_percent: number;
          cumulative_users: number;
          status: Database["public"]["Enums"]["org_status"];
          expires_at: string | null;
          days_left: number | null;
          created_at: string;
        }[];
      };
      su_course_tree: {
        Args: never;
        Returns: {
          course_id: string;
          course_title: string;
          course_slug: string;
          is_published: boolean;
          module_id: string | null;
          module_title: string | null;
          module_summary: string | null;
          module_order: number | null;
          lesson_id: string | null;
          lesson_title: string | null;
          lesson_desc: string | null;
          lesson_order: number | null;
          duration_sec: number | null;
          bunny_video_id: string | null;
        }[];
      };
      su_quiz_tree: {
        Args: never;
        Returns: {
          quiz_id: string;
          quiz_title: string;
          module_id: string | null;
          module_title: string | null;
          pass_score: number;
          is_final: boolean;
          question_id: string | null;
          prompt: string | null;
          topic: string | null;
          question_order: number | null;
          option_id: string | null;
          label: string | null;
          is_correct: boolean | null;
          option_order: number | null;
        }[];
      };
      su_extend_access: {
        Args: { p_org: string; p_months: number };
        Returns: { out_ok: boolean; out_expires_at: string | null }[];
      };
      su_add_seats: {
        Args: { p_org: string; p_delta: number };
        Returns: { out_ok: boolean; out_package_size: number }[];
      };
      su_set_org_status: {
        Args: {
          p_org: string;
          p_status: Database["public"]["Enums"]["org_status"];
        };
        Returns: { out_ok: boolean }[];
      };
      su_set_course_published: {
        Args: { p_course: string; p_published: boolean };
        Returns: { out_ok: boolean }[];
      };
      su_save_module: {
        Args: {
          p_id: string | null;
          p_course: string;
          p_title: string;
          p_summary: string | null;
        };
        Returns: { out_ok: boolean; out_id: string | null }[];
      };
      su_save_lesson: {
        Args: {
          p_id: string | null;
          p_module: string;
          p_title: string;
          p_description: string | null;
          p_duration_sec: number;
          p_bunny_video_id: string | null;
        };
        Returns: { out_ok: boolean; out_id: string | null }[];
      };
      su_move_lesson: {
        Args: { p_id: string; p_direction: number };
        Returns: { out_ok: boolean }[];
      };
      su_delete_lesson: {
        Args: { p_id: string };
        Returns: { out_ok: boolean; out_reason: string }[];
      };
      su_save_question: {
        Args: {
          p_id: string | null;
          p_quiz: string;
          p_prompt: string;
          p_topic: string;
          p_options: Json;
        };
        Returns: { out_ok: boolean; out_id: string | null }[];
      };
      su_delete_question: {
        Args: { p_id: string };
        Returns: { out_ok: boolean }[];
      };
      su_set_pass_score: {
        Args: { p_quiz: string; p_score: number };
        Returns: { out_ok: boolean }[];
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
      user_role: "employee" | "org_admin" | "superadmin" | "viewer";
      user_status: "active" | "removed";
      webinar_touch: "live" | "recording";
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
