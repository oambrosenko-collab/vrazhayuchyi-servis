import Image from "next/image";
import { Section } from "./section";

/**
 * Who teaches the thing.
 *
 * Built in the reference's split-panel shape — picture flush against a
 * panel of copy, no gap between them — because this is the one section
 * where a face does more than any amount of text.
 *
 * The portrait is generated, commissioned for this page, and stands in
 * for a real trainer — the owner knows and chose to keep it for now. It
 * is a placeholder with a deadline, not a decision: a visitor reads it as
 * what Viktoriia looks like, so it should give way to a real photograph
 * before the page goes public. Swapping it is one line.
 *
 * Everything below the four given facts — consultant, trainer, fifteen
 * years, known Ukrainian restaurants and cafés — is written, not sourced.
 * It must be read by Viktoriia before this page is public.
 */
const PHOTO: string | null =
  "https://res.cloudinary.com/zb7a4nip/image/upload/c_fill,g_face,ar_4:5/v1792846710/close-up-portrait-smiling-blonde-businesswoman-formal-dressed-isolated-dark-textured-background-2.jpg";

const BIO = [
  "Понад п'ятнадцять років Вікторія Хижняк вибудовує сервіс у закладах — від невеликих кав'ярень до ресторанів, відомих в Україні. Предмет її роботи — не гостинність як концепція, а те, що гість відчуває за столом: чи побачили, що йому потрібно, чи дали трохи більше, ніж він очікував.",
  "Курс і щомісячні вебінари на платформі веде вона, тому в основу матеріалу покладено прийоми, перевірені в реальних залах, а не теоретичні посібники з гостинності.",
];

const DETAIL = [
  "Формат роботи із закладом: аналіз поточного стану обслуговування, розробка стандартів під конкретне меню та формат, навчання команди й повторна оцінка через кілька місяців — без неї результат навчання зберігається приблизно до першої напруженої зміни.",
  "На платформі Вікторія відповідає за програму курсу, тематичний план щомісячних вебінарів і розбір ситуацій, які надають самі заклади.",
];

export function Trainer() {
  return (
    <Section className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] lg:grid-cols-[0.8fr_1fr]">
        {/* Picture flush to the panel: the reference joins them without a
            gutter, and the seam is what makes the pair read as one object. */}
        <div className="relative min-h-[22rem] bg-[var(--color-surface-raised)] lg:min-h-full">
          {PHOTO ? (
            <Image
              src={PHOTO}
              alt="Вікторія Хижняк"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-top"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-[var(--space-6)] text-center text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Тут буде фото Вікторії
            </div>
          )}
        </div>

        <div className="bg-[var(--color-surface)] p-[var(--space-8)] md:p-[var(--space-12)]">
          <span className="text-[length:var(--text-xs)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-label)] text-[var(--color-accent)]">
            Тренер курсу
          </span>

          <h2 className="mt-[var(--space-3)] text-[length:var(--text-h1)] font-[var(--weight-bold)] md:text-[2.25rem]">
            Вікторія Хижняк
          </h2>

          <p className="mt-[var(--space-2)] text-[var(--color-periwinkle)]">
            Бізнес-консультант і тренер · понад 10 років практики
          </p>

          {BIO.map((para) => (
            <p
              key={para.slice(0, 24)}
              className="mt-[var(--space-4)] text-[var(--color-text-secondary)]"
            >
              {para}
            </p>
          ))}

          {/* An expander rather than a link: there is no biography page to
              point at, and a button that 404s costs more trust than the
              extra paragraphs buy. */}
          <details className="group mt-[var(--space-6)]">
            <summary className="tap inline-flex min-h-[var(--tap-min)] cursor-pointer list-none items-center font-[var(--weight-semibold)]">
              Детальніше...
            </summary>

            {DETAIL.map((para) => (
              <p
                key={para.slice(0, 24)}
                className="mt-[var(--space-4)] text-[var(--color-text-secondary)]"
              >
                {para}
              </p>
            ))}
          </details>
        </div>
      </div>
    </Section>
  );
}
