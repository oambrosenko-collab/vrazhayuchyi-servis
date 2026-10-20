// Generated from the Supabase project schema. Do not edit by hand.
// Regenerate after every migration:
//   supabase gen types typescript --project-id bgyjpjdrjscfdrfrgdqd > src/lib/supabase/types.ts
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
