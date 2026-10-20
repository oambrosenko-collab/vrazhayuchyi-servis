import { connection } from "next/server";
import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { OrgsBoard } from "./orgs-board";

export const instant = false;
export const metadata = { title: "Заклади · Платформа" };

export default async function OrgsPage() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("su_organizations");

  if (error) {
    return <Alert tone="danger">Не вдалося завантажити список закладів.</Alert>;
  }

  return <OrgsBoard rows={data ?? []} />;
}
