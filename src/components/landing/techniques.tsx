import Image from "next/image";
import { Section, SectionHead } from "./section";

/**
 * What "вражаючий сервіс" actually means, in examples.
 *
 * Without this the promise is an adjective, and every competitor claims
 * the same adjective. These are the kind of thing the course and the
 * webinars take apart — concrete enough that an owner recognises their
 * own floor in them.
 */
const TECHNIQUES = [
  {
    title: "Побачити, з чим прийшов гість",
    body: "Побачення, ділова зустріч і родина з дитиною потребують різного темпу подачі й різної дистанції. Працівник, який зчитує це в перші секунди, дає кожному столу саме той формат уваги, якого той потребує.",
  },
  {
    title: "Рекомендація, що звучить як турбота",
    body: "Замість загальної пропозиції додаткової позиції — точна рекомендація до вже зробленого замовлення. Гість отримує допомогу у виборі, заклад — вищий середній чек; одне не суперечить іншому.",
  },
  {
    title: "Випередити незручність",
    body: "Гість сприймає очікування спокійно, якщо дізнається про затримку від працівника раніше, ніж помітить її самостійно. Та сама ситуація, повідомлена вчасно, залишає враження уваги, а не недогляду.",
  },
  {
    title: "Завершити візит так, щоб його згадали",
    body: "Останні секунди контакту значною мірою визначають підсумкове враження й рішення прийти ще раз. У періоди завантаження залу їх скорочують першими.",
  },
];

/**
 * Background photograph, almost entirely suppressed.
 *
 * Desaturated and dropped to 30% so it reads as texture rather than as a
 * picture — the section is a list of techniques, and a legible photo
 * behind body copy competes with it for attention. The gradient on top
 * returns the page colour at the edges, so the image has no visible seam
 * where the section ends.
 */
const PHOTO =
  "https://res.cloudinary.com/zb7a4nip/image/upload/v1792836728/waiter-is-serving-hot-dishes-two-attractive-women-restaurant-2.jpg";


/**
 * The quotation mark, traced from the reference the owner supplied.
 *
 * One mark is a solid rectangle with a leg hanging off its right half,
 * falling down and to the left, cut square at the bottom — the geometric
 * «99» form. The notch under the left half of the block is what makes it
 * read as a quotation mark rather than as a bar.
 *
 * Drawn rather than typeset: Fixel renders «”» as a pair of rounded
 * commas, which is a different figure. Decorative only, so the whole
 * thing is hidden from screen readers — these are techniques, not
 * quotations from anybody.
 */
function QuoteMark({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 48 34"
      width="34"
      height="24"
      aria-hidden
      style={{ color }}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M0 0h20v20l-6 14H4l6-14H0z" />
      <path d="M28 0h20v20l-6 14h-10l6-14h-10z" />
    </svg>
  );
}

export function Techniques() {
  return (
    <Section className="relative isolate overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <Image
        src={PHOTO}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="scale-x-[-1] object-cover opacity-[0.3] grayscale"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom," +
            " var(--color-bg) 0%," +
            " color-mix(in srgb, var(--color-bg) 55%, transparent) 38%," +
            " color-mix(in srgb, var(--color-bg) 55%, transparent) 62%," +
            " var(--color-bg) 100%)",
        }}
      />

      <div className="relative">
      <SectionHead
        label="Зміст навчання"
        labelTone="accent"
        title="З чого складається турбота, яку гість помічає"
        lead="Вау-ефект виникає не з ввічливості, якої навчений кожен заклад, а з уваги до конкретної людини за столом: побачити, що їй потрібно зараз, і дати трохи більше, ніж вона очікує. Нижче наведено приклади прийомів, які розглядаються в курсі та на щомісячних вебінарах."
      />

      <ul className="grid gap-[var(--space-6)] sm:grid-cols-2">
        {TECHNIQUES.map((t) => (
          <li
            key={t.title}
            className="border-l-2 pl-[var(--space-4)]"
            style={{ borderColor: "var(--color-periwinkle)" }}
          >
            <QuoteMark color="var(--color-periwinkle)" />
            <h3 className="mt-[var(--space-4)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
              {t.title}
            </h3>
            <p className="mt-[var(--space-1)] text-[var(--color-text-secondary)]">
              {t.body}
            </p>
          </li>
        ))}
      </ul>

      {/* The same tinted rail as «Суть підходу»: a closing note that
          belongs to the section rather than trailing off under it. */}
      <div
        className="mt-[50px] max-w-[44rem] rounded-r-[var(--radius-md)] border-l-2 border-[var(--color-accent)] py-[var(--space-3)] pl-[var(--space-6)]"
        style={{
          background:
            "linear-gradient(to right, var(--color-accent-soft), transparent 70%)",
        }}
      >
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Теми вебінарів формуються зокрема з ситуацій, які надають самі
          заклади. Відтак протягом року програма переходить від загальних
          прийомів до розбору випадків із залів клієнтів.
        </p>
      </div>
      </div>
    </Section>
  );
}
