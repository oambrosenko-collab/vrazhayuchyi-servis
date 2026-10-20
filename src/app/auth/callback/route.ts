import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the email link lands. Accepts both shapes a Supabase email can use.
 *
 * `token_hash` is the one we want. PKCE's `code` binds the link to the
 * browser that requested it, via a code_verifier cookie — and that breaks
 * the most ordinary path this product has: the manager drops the invite in a
 * work chat, the waiter opens it in Telegram's in-app browser, types their
 * email, then opens the letter in the Gmail app, whose in-app browser is a
 * different cookie jar. Same phone, same person, dead link. A token hash
 * carries everything needed, so any browser works.
 *
 * `code` stays supported because editing the email template requires custom
 * SMTP, and until that is connected Supabase sends its stock template, which
 * emits `code`. Once Resend is wired and the templates point at
 * `token_hash`, this branch becomes dead weight and can go — see
 * docs/SETUP.md.
 */

const ALLOWED_TYPES: readonly EmailOtpType[] = [
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Open redirect guard: `next` travels through the email link.
  const rawNext = searchParams.get("next") ?? "/learn";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/learn";

  const failed = NextResponse.redirect(`${origin}/login?error=link_invalid`);

  const supabase = await createClient();
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");

  if (tokenHash) {
    const rawType = searchParams.get("type") ?? "email";
    const type = ALLOWED_TYPES.includes(rawType as EmailOtpType)
      ? (rawType as EmailOtpType)
      : "email";

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    // Expired, already used, or tampered with — one screen covers all three.
    return error ? failed : NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Also fails when the link is opened in a different browser than the one
    // that asked for it, because the PKCE verifier cookie lives there.
    return error ? failed : NextResponse.redirect(`${origin}${next}`);
  }

  return failed;
}
