import { z } from "zod";

// Fail at boot with a readable message rather than at the first request
// with "Invalid URL" from deep inside the Supabase client.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url(),
  // Server-only, used solely by src/lib/supabase/admin.ts. Optional here
  // so the rest of the app still boots without it — only the demo-viewer
  // route (/view/[token]/enter) needs it, and it fails there with its own
  // clear message rather than at import time for every request.
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
});
