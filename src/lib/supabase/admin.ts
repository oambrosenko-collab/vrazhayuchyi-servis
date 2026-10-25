import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. Holds `SUPABASE_SECRET_KEY`, which bypasses RLS
 * entirely — server-only, never imported by a Client Component.
 *
 * Its one job today: `auth.admin.generateLink()` for the demo-viewer
 * route (`/view/[token]/enter`), so that flow never calls
 * `signInWithOtp` and never touches Supabase's built-in mailer, which
 * this project's free-tier rate limit makes unusable for an on-demand
 * link (see docs/SETUP.md on why Resend isn't connected yet).
 */
export function createAdminClient() {
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set — the demo-viewer link needs it.",
    );
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
