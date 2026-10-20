import { NextResponse } from "next/server";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import { createElement as h } from "react";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

// Node is already the default runtime, and reading the session cookie
// makes this handler dynamic on its own. Declaring either explicitly is
// rejected once cacheComponents is on.

/**
 * The certificate as a file.
 *
 * Built on request rather than stored: the row in `certificates` is the
 * record of truth, and it already carries the name and the restaurant as
 * they were on the day it was issued. Regenerating from those frozen
 * fields produces the same document every time without a storage bucket
 * to keep in step.
 *
 * Cyrillic needs a font that has it — the built-in Helvetica does not,
 * and names would silently render as blanks. Roboto ships in the repo
 * rather than being fetched at render time: a certificate must not
 * depend on a third-party host being reachable, and a blank name is
 * worse than no file at all.
 */
const fontDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(fontDir, "Roboto-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Roboto-Bold.ttf"), fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    backgroundColor: "#FFFFFF",
    paddingVertical: 64,
    paddingHorizontal: 72,
    color: "#1E222B",
  },
  frame: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#D8DCE4",
    paddingVertical: 56,
    paddingHorizontal: 48,
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#6B7384",
    textTransform: "uppercase",
  },
  rule: { width: 48, height: 3, backgroundColor: "#F5A33E", marginTop: 20 },
  name: { fontSize: 28, fontWeight: 700, marginTop: 28, textAlign: "center" },
  org: { fontSize: 12, color: "#6B7384", marginTop: 8 },
  lead: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#6B7384",
    marginTop: 32,
    textTransform: "uppercase",
  },
  course: { fontSize: 16, fontWeight: 700, marginTop: 8, textAlign: "center" },
  footer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E6E9EF",
    paddingTop: 14,
  },
  meta: { fontSize: 9, color: "#6B7384" },
});

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("certificate_status");
  const cert = data?.[0];

  // No row, or a row without a number, means it was never issued. RLS
  // already scoped this to the signed-in person, so there is nothing to
  // check about ownership here.
  if (!cert?.number) {
    return NextResponse.redirect(
      new URL("/learn/certificate", process.env.NEXT_PUBLIC_SITE_URL),
    );
  }

  const issued = new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "long",
  }).format(cert.issued_at ? new Date(cert.issued_at) : new Date());

  const doc = h(
    Document,
    { title: `Сертифікат ${cert.number}`, author: "Вражаючий сервіс" },
    h(
      Page,
      { size: "A4", orientation: "landscape", style: s.page },
      h(
        View,
        { style: s.frame },
        h(
          View,
          { style: { alignItems: "center" } },
          h(Text, { style: s.kicker }, "Вражаючий сервіс"),
          h(View, { style: s.rule }),
        ),
        h(
          View,
          { style: { alignItems: "center" } },
          h(Text, { style: s.kicker }, "Сертифікат про проходження курсу"),
          h(Text, { style: s.name }, cert.full_name ?? "—"),
          h(Text, { style: s.org }, cert.org_name ?? "—"),
          // A label, not a sentence: every Ukrainian verb here would
          // carry a gender the product never asks anyone for.
          h(Text, { style: s.lead }, "курс"),
          h(Text, { style: s.course }, cert.course_title),
        ),
        h(
          View,
          { style: s.footer },
          h(Text, { style: s.meta }, `№ ${cert.number}`),
          h(Text, { style: s.meta }, issued),
        ),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sertyfikat-${cert.number}.pdf"`,
      // Personal and freshly rendered; no shared cache should hold it.
      "Cache-Control": "private, no-store",
    },
  });
}
