import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Вражаючий сервіс",
  description:
    "Навчання персоналу ресторану, яке працює попри плинність кадрів.",
};

export const viewport: Viewport = {
  themeColor: "#1E222B",
  // No maximum-scale: pinch-zoom must stay available.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
