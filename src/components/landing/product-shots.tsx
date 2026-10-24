import { RadialMeter } from "@/components/charts/radial-meter";
import { Meter } from "@/components/charts/meter";
import { Distribution } from "@/components/charts/distribution";
import { Section, SectionHead } from "./section";

/**
 * This section stands where the PRD put venue logos, a manager's quote and
 * a lesson fragment. All three would have to be invented: there are no
 * customers, nobody to quote, and the course is not filmed.
 *
 * So the proof is the interface itself — and not as a picture of it. The
 * owner's panel below is assembled from the very components `/admin`
 * renders, `RadialMeter` and `Distribution` and `Meter`, fed the numbers a
 * mid-year restaurant actually has. The two phone panels are built from
 * the same UI kit and the same tokens as the screens they mirror.
 *
 * Which is why there are no screenshots here: a PNG goes stale the day the
 * interface changes, blurs on a retina screen and weighs more than the
 * rest of the page. This cannot drift, because it is the same code.
 */

/**
 * Every frame sizes to what is inside it.
 *
 * Fixed aspect ratios were tried first and cropped at both ends: 9:16
 * clipped the waiter's list where the grid turns two columns, and 16:10
 * cut the owner's panel on a phone, where the same content stacks and
 * grows taller. A frame that crops its own content is worse than one an
 * inch off square. The two phones stretch to the taller of the pair, so
 * they still line up.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)]">
      {children}
    </div>
  );
}

function Caption({ title, body }: { title: string; body: string }) {
  return (
    <figcaption className="mt-[var(--space-4)] shrink-0">
      <h3 className="text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
        {title}
      </h3>
      <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        {body}
      </p>
    </figcaption>
  );
}

/** A restaurant halfway through its year: 21 of 25 seats live. */
function OwnerPanel() {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex items-baseline justify-between gap-[var(--space-4)]">
        <span className="font-[var(--weight-semibold)]">
          Кав&apos;ярня «Тераса»
        </span>
        <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          доступ до 19.10.2027
        </span>
      </div>

      <div className="flex flex-col items-center gap-[var(--space-4)] sm:flex-row sm:items-center sm:gap-[var(--space-6)]">
      <div className="shrink-0">
        <RadialMeter
          value={21}
          max={25}
          valueText="21"
          caption="із 25 місць зайнято"
          title="Зайнято 21 місце із 25"
        />
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col gap-[var(--space-4)]">
        <Distribution
          bins={[
            { label: "Не починали", count: 2 },
            { label: "До половини", count: 6 },
            { label: "Більше половини", count: 7 },
            { label: "Завершили", count: 6 },
          ]}
          total={21}
          empty=""
        />
        <Meter
          label="Вебінари за три місяці"
          value={47}
          max={63}
          valueText="47 з 63"
        />
      </div>
      </div>

      <div className="grid grid-cols-3 gap-[var(--space-3)]">
        {[
          ["Середній прогрес", "64%"],
          ["Завершили курс", "6"],
          ["Застрягли", "2"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)]"
          >
            <span className="block text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
              {label}
            </span>
            <span className="mt-[var(--space-1)] block font-[var(--weight-bold)]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The waiter's dashboard: one action, then the list. */
function LearnPanel() {
  const modules = [
    { title: "Погляд і привітання", done: true },
    { title: "Посадка і меню", done: true },
    { title: "Прийом замовлення", done: true },
    { title: "Темп подачі", done: true },
    { title: "Рекомендація", done: true },
    { title: "Коли щось пішло не так", done: false },
    { title: "Розрахунок і прощання", done: false },
  ];

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
        Кав&apos;ярня «Тераса»
      </span>

      <div className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--color-text-on-accent)]">
        <span className="block font-[var(--weight-bold)]">Продовжити</span>
        <span className="block text-[length:var(--text-sm)] opacity-80">
          Рекомендація
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
          Прогрес
        </span>
        <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          5 із 8
        </span>
      </div>
      <div className="h-[8px] w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface)]">
        <div className="h-full w-[62%] bg-[var(--color-success)]" />
      </div>

      <ul className="mt-[var(--space-1)] flex flex-col">
        {modules.map((m) => (
          <li
            key={m.title}
            className="flex items-center gap-[var(--space-3)] border-b border-[var(--color-border)] py-[var(--space-2)] last:border-0"
          >
            <span
              aria-hidden
              className={
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-full)] text-[length:var(--text-xs)] " +
                (m.done
                  ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                  : "border border-[var(--color-border-strong)]")
              }
            >
              {m.done ? "✓" : ""}
            </span>
            <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)]">
              {m.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The schedule: the next broadcast, then what is already recorded. */
function WebinarPanel() {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-surface)] p-[var(--space-3)]">
        <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-accent)]">
          через 6 днів
        </span>
        <p className="mt-[var(--space-1)] font-[var(--weight-semibold)]">
          Коли страва затрималась
        </p>
        <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          3 листопада, 19:00 · 60 хв
        </p>
        <div className="mt-[var(--space-3)] rounded-[var(--radius-md)] bg-[var(--color-accent)] py-[var(--space-2)] text-center text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[var(--color-text-on-accent)]">
          Приєднатись
        </div>
      </div>

      <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
        Архів записів
      </span>
      {[
        { title: "Рекомендація як послуга", note: "запис" },
        { title: "Як прочитати стіл", note: "переглянуто" },
        { title: "Постійний гість", note: "переглянуто" },
        { title: "Прощання за десять секунд", note: "запис" },
        { title: "Темп подачі ввечері", note: "переглянуто" },
      ].map((w) => (
        <div
          key={w.title}
          className="flex items-center justify-between gap-[var(--space-2)] border-b border-[var(--color-border)] pb-[var(--space-2)] last:border-0"
        >
          <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)]">
            {w.title}
          </span>
          <span className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {w.note}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProductShots() {
  return (
    <Section className="border-t border-[var(--color-border)]">
      <SectionHead
        label="Інтерфейс"
        labelTone="accent"
        title="Як система виглядає в роботі"
        lead="Нижче наведено не макети й не знімки екрана, а сам інтерфейс: панель керівника побудована з тих самих компонентів, які відображає кабінет, із показниками закладу в середині року. Логотипи клієнтів на сторінці відсутні свідомо — продукт новий, і посилатися на чужі логотипи було б некоректно."
      />

      <div className="grid gap-[var(--space-8)] md:grid-cols-2 md:items-start">
        <figure>
          <Frame>
            <OwnerPanel />
          </Frame>
          <Caption
            title="Панель керівника"
            body="Частка задіяних місць, розподіл команди за рівнем проходження та участь у вебінарах. Середній відсоток свідомо не винесено на перший план: він однаковий і коли команда рівномірно просувається, і коли половина ще не починала."
          />
        </figure>

        <div className="grid gap-[var(--space-6)] sm:grid-cols-2 sm:items-stretch">
          <figure className="flex flex-col">
            <div className="flex-1">
              <Frame>
                <LearnPanel />
              </Frame>
            </div>
            <Caption
              title="Кабінет працівника"
              body="Одна основна дія та показник прогресу. Працівник відкриває застосунок і продовжує з того місця, де спинився."
            />
          </figure>

          <figure className="flex flex-col">
            <div className="flex-1">
              <Frame>
                <WebinarPanel />
              </Frame>
            </div>
            <Caption
              title="Розклад вебінарів"
              body="Найближчий вебінар та архів записів. Працівники, зайняті в зміні, переглядають матеріал пізніше."
            />
          </figure>
        </div>
      </div>
    </Section>
  );
}
