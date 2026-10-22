import { connection } from "next/server";
import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { WebinarEditor } from "./webinar-editor";

export const instant = false;
export const metadata = { title: "Вебінари · Платформа" };

export default async function SuWebinarsPage() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("su_webinars");

  if (error) {
    return <Alert tone="danger">Не вдалося завантажити вебінари.</Alert>;
  }

  return <WebinarEditor rows={data ?? []} />;
}
