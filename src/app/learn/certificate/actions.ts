"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const REASONS: Record<string, string> = {
  not_eligible: "Курс ще не пройдений повністю.",
  no_course: "Курс ще не опублікований.",
  not_authenticated: "Сесія закінчилась. Увійди ще раз.",
};

/**
 * Asks the server to mint the certificate. Eligibility is re-checked
 * there — this button only becomes visible when the page thinks the
 * course is finished, and a page is not evidence.
 */
export async function issueCertificate(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_certificate");

  if (error) return { error: "Не вдалося видати сертифікат. Спробуй ще раз." };

  const row = data?.[0];
  if (!row?.out_ok) {
    return {
      error:
        (row?.out_reason && REASONS[row.out_reason]) ??
        "Щось пішло не так. Спробуй ще раз за хвилину.",
    };
  }

  revalidatePath("/learn/certificate");
  revalidatePath("/learn");
  return {};
}
