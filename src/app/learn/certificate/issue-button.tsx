"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, Button } from "@/components/ui";
import { issueCertificate } from "./actions";

export function IssueButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {error && <Alert tone="danger">{error}</Alert>}
      <Button
        full
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await issueCertificate();
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Готуємо…" : "Отримати сертифікат"}
      </Button>
    </div>
  );
}
