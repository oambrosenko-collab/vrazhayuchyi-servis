import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Signs the visitor straight into the shared demo-viewer identity — no
 * email, no click-through, no name prompt. `/view/[token]/page.tsx`
 * redirects here for anyone not already signed in; this is the only
 * place in the app that touches `auth.admin.generateLink()`.
 *
 * Every visitor becomes the *same* underlying account
 * (`DEMO_VIEWER_EMAIL`), which is what makes the link reusable without
 * limit: there is nothing per-visitor to run out of. `generateLink`
 * mints a token without sending anything, so this never touches
 * Supabase's built-in mailer or its rate limit — the reason this route
 * exists at all. `claim_view_access` is idempotent on an existing
 * `viewer` row, so calling it on every visit is cheap and simple rather
 * than tracking whether this particular browser has been here before.
 */
const DEMO_VIEWER_EMAIL = "demo-viewer@vrazhayuchyi-servis.vercel.app";

/** Where each role actually lives — same mapping as the claim action. */
const HOME: Record<string, string> = {
  viewer: "/su",
  superadmin: "/su",
  org_admin: "/admin",
  employee: "/learn",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const origin = request.nextUrl.origin;
  const failed = NextResponse.redirect(
    `${origin}/view/${token}?error=enter_failed`,
  );

  const supabase = await createClient();

  const { data: lookup } = await supabase.rpc("lookup_view_invite", {
    p_token: token,
  });
  if (!lookup?.[0]?.out_valid) {
    return NextResponse.redirect(`${origin}/view/${token}`);
  }

  const admin = createAdminClient();
  const { data: link, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: DEMO_VIEWER_EMAIL,
    });
  if (linkError || !link) return failed;

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) return failed;

  const { data: claim } = await supabase.rpc("claim_view_access", {
    p_token: token,
    p_full_name: "Демоперегляд",
  });
  const row = claim?.[0];
  if (!row?.out_ok) return failed;

  return NextResponse.redirect(`${origin}${HOME[row.out_role] ?? "/su"}`);
}
