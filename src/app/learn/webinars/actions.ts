"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Record the touch, then hand the person over to Zoom or to the recording.
 *
 * A server action rather than a plain link: the link is what we are
 * counting, so the count has to happen on the way through. It also means
 * the button works with JavaScript disabled, which matters on the phones
 * this is used from.
 *
 * The RPC decides whether the link may be handed out at all — expired
 * access, an unpublished webinar or a broadcast that already ended all
 * come back as a refusal, and the person lands back on the schedule
 * instead of on a dead Zoom room.
 */
export async function openWebinar(form: FormData): Promise<void> {
  const id = String(form.get("webinar_id") ?? "");
  const source = form.get("source") === "recording" ? "recording" : "live";

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("record_webinar_touch", {
    p_webinar: id,
    p_source: source,
  });

  if (error || data?.[0]?.out_ok !== true) {
    redirect("/learn/webinars?error=unavailable");
  }

  // Re-read the row for the link itself. The RPC returns a verdict, not a
  // URL: handing out an address from a write call would make it a second
  // source of truth for who may see what.
  const { data: feed } = await supabase.rpc("webinar_feed");
  const row = feed?.find((w) => w.webinar_id === id);
  const url = source === "recording" ? row?.recording_url : row?.join_url;

  if (!url) redirect("/learn/webinars?error=unavailable");

  revalidatePath("/learn/webinars");
  revalidatePath("/learn");
  redirect(url);
}
