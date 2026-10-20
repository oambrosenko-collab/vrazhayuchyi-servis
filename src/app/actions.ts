"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/* ------------------------------------------------------------------ */
/* Messages. Every DB reason code maps to one Ukrainian sentence, so   */
/* the UI never shows a raw code and never invents its own wording.    */
/* ------------------------------------------------------------------ */

const REASONS: Record<string, string> = {
  invalid_link: "Посилання недійсне. Попроси управляючого надіслати актуальне.",
  expired: "Доступ закладу закінчився. Звернись до управляючого.",
  suspended: "Доступ закладу призупинено. Звернись до управляючого.",
  no_seats: "Місця закінчились. Звернись до управляючого — він звільнить місце.",
  member_of_other_org: "Ця пошта вже прив'язана до іншого закладу.",
  bad_name: "Вкажи ім'я — від 2 до 120 символів.",
  not_authenticated: "Сесія закінчилась. Увійди ще раз.",
  forbidden: "Недостатньо прав для цієї дії.",
  not_found: "Запис не знайдено.",
  cannot_remove_self: "Не можна звільнити власне місце.",
  no_org: "Акаунт не прив'язаний до закладу.",
};

function message(reason: string | null | undefined) {
  return (
    (reason && REASONS[reason]) ??
    "Щось пішло не так. Спробуй ще раз за хвилину."
  );
}

export type ActionState = { error?: string; ok?: string } | null;

/* ------------------------------------------------------------------ */
/* Magic link                                                          */
/* ------------------------------------------------------------------ */

const emailSchema = z.email("Схоже, у пошті помилка.");

export async function sendMagicLink(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = emailSchema.safeParse(
    String(formData.get("email") ?? "").trim(),
  );
  if (!email.success) return { error: email.error.issues[0].message };

  // `next` carries the page to land on after the link is clicked. It is
  // user-supplied, so only same-site paths are ever accepted.
  const raw = String(formData.get("next") ?? "/learn");
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/learn";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return {
      error:
        error.status === 429
          ? "Забагато спроб. Зачекай хвилину й спробуй ще раз."
          : "Не вдалося надіслати лист. Спробуй ще раз.",
    };
  }

  return { ok: email.data };
}

/* ------------------------------------------------------------------ */
/* Joining a restaurant                                                */
/* ------------------------------------------------------------------ */

export async function joinOrganization(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (fullName.length < 2) return { error: REASONS.bad_name };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_organization", {
    p_token: token,
    p_full_name: fullName,
  });

  if (error) return { error: message(null) };

  const row = data?.[0];
  if (!row?.out_ok) return { error: message(row?.out_reason) };

  redirect(row.out_role === "employee" ? "/learn" : "/admin");
}

/* ------------------------------------------------------------------ */
/* Admin of the restaurant                                             */
/* ------------------------------------------------------------------ */

export async function releaseSeat(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = String(formData.get("user_id") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("release_seat", {
    p_user_id: userId,
  });

  if (error) return { error: message(null) };

  const row = data?.[0];
  if (!row?.out_ok) return { error: message(row?.out_reason) };

  revalidatePath("/admin");
  return { ok: "Місце звільнено." };
}

export async function regenerateInvite(): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_invite");

  if (error) return { error: message(null) };

  const row = data?.[0];
  if (!row?.out_ok) return { error: message(row?.out_reason) };

  revalidatePath("/admin");
  return { ok: "Нове посилання створено. Старе більше не працює." };
}
