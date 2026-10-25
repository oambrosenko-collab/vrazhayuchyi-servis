import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { Highlights } from "@/components/landing/highlights";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { YearValue } from "@/components/landing/year-value";
import { Techniques } from "@/components/landing/techniques";
import { Trainer } from "@/components/landing/trainer";
import { SeatReuse } from "@/components/landing/seat-reuse";
import { ProductShots } from "@/components/landing/product-shots";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { RequestForm } from "@/components/landing/request-form";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Вражаючий сервіс — навчання персоналу для ресторанів",
  description:
    "Сервіс, заради якого гості повертаються: турбота про гостя як система. Вхідний курс для нових працівників, щомісячні вебінари для команди та звітність, що показує рівень поіменно. Пакети на 10–50 місць, доступ на 12 місяців.",
};

/**
 * Section order follows the PRD page map.
 *
 * Two substitutions. Venue logos, a manager's quote and a lesson fragment
 * gave way to `ProductShots` — nothing to quote, nobody to show, and the
 * course is not filmed. And the annual price is argued before the price is
 * shown: `YearValue` answers "навіщо рік, якщо курс на три дні",
 * `Techniques` says what the year actually teaches.
 *
 * There was an "early stage" block here too, stating plainly that there
 * are no customers yet and the content is still ahead. Removed on
 * request. What still carries that honesty is the `ProductShots` lead,
 * which says why there are no client logos on the page.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="grow">
        <Hero />
        <Highlights />
        <Problem />
        <HowItWorks />
        <YearValue />
        <Techniques />
        <SeatReuse />
        <ProductShots />
        <Pricing />
        <Trainer />
        <Faq />
        <RequestForm />
      </main>
      <SiteFooter />
    </>
  );
}
