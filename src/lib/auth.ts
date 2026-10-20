import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type AppUser = Tables<"users">;

/**
 * The signed-in person's row in `users`, or null.
 *
 * A row can be missing for a legitimate reason: someone authenticated via a
 * magic link but has not claimed a seat yet. Callers decide what that means.
 */
export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS lets a person read their own row even after the seat is freed, so a
  // removed employee gets the "access revoked" screen instead of a crash.
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

/** Signed in and holding an active seat, or bounced. */
export async function requireActiveUser(): Promise<AppUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Authenticated but never joined a restaurant: nothing to show them.
  if (!row) redirect("/login?error=no_membership");
  if (row.status === "removed") redirect("/access-revoked");

  return row;
}

export async function requireOrgAdmin(): Promise<AppUser> {
  const user = await requireActiveUser();
  if (user.role !== "org_admin" && user.role !== "superadmin") {
    redirect("/learn");
  }
  return user;
}
