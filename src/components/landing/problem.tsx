import { Card, Label } from "@/components/ui";
import { TRIO } from "./accents";
import { Section, SectionHead } from "./section";

/**
 * Why the product is built as a year rather than a course.
 *
 * Two facts act at once: the room turns over, and the attention of the
 * people already in it fades. Only the first half carries numbers, because
 * only it has sourced ones — the second stays prose rather than inventing
 * a statistic.
 *
 * Colour here does a job rather than decorating. The three figures run in
 * the chart-token order the design system fixed (accent, periwinkle,
 * mint), and the accent sits on the one number that carries the argument:
 * if the room did not turn over, nothing else on this page would be
 * necessary. The other two are context, so they take the complementary
 * hues and step back.
 */
const TURNOVER_FACTS = [
  {
    value: "50–100%",
    label: "Плинність",
    hint: "Середньорічний показник у галузі HoReCa",
    tone: TRIO[0],
  },
  {
    value: "2–3 дні",
    label: "Від найму до залу",
    hint: "Стільки часу є, щоб новачок почав працювати як команда",
    tone: TRIO[1],
  },
  {
    value: "~15 людей",
    label: "Новачків за рік",
    hint: "Для закладу на 25 осіб за плинності 60%",
    tone: TRIO[2],
  },
];

export function Problem() {
  return (
    /* The extra top padding at `lg` is the strip's lower half plus the
     * section's own rhythm: without it the first label sits ten pixels
     * under the panel, which reads as a collision rather than a seam. */
    <Section className="border-t border-[var(--color-border)] lg:pt-[12rem]">
      <SectionHead
        label="Суть підходу"
        labelTone="accent"
        title="Враження створює людина — платформа робить цю навичку системою"
        lead={
          <>
            Гість повертається не через дотримання регламенту, а через
            відчуття, що про нього подбали:{" "}
            <span className="text-[var(--color-text)]">
              побачили, що йому потрібно зараз, і дали трохи більше
            </span>
            . Таке враження створює конкретний працівник у конкретну зміну,
            тому завдання платформи — зробити цю увагу відтворюваною: закласти
            її новим працівникам і підтримувати в тих, хто працює давно.
          </>
        }
      />

      <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
        Що враховує система: склад команди оновлюється
      </span>

      <div className="mt-[var(--space-4)] grid gap-[var(--space-4)] sm:grid-cols-3">
        {TURNOVER_FACTS.map((f) => (
          <Card key={f.label} className="relative overflow-hidden">
            {/* A rule in the figure's own colour, across the top edge of
                the card — the mark that says these three belong to one
                set without painting three loud panels. */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: f.tone.color }}
            />
            <Label>{f.label}</Label>
            <p
              className="mt-[var(--space-2)] text-[length:var(--text-display)] font-[var(--weight-bold)]"
              style={{ color: f.tone.color }}
            >
              {f.value}
            </p>
            <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              {f.hint}
            </p>
          </Card>
        ))}
      </div>

      <div
        className="mt-[50px] max-w-[44rem] rounded-r-[var(--radius-md)] border-l-2 border-[var(--color-accent)] py-[var(--space-2)] pl-[var(--space-6)]"
        style={{
          background:
            "linear-gradient(to right, var(--color-accent-soft), transparent 70%)",
        }}
      >
        <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-accent)]">
          Що враховує система: увага слабшає без підтримки
        </span>
        <p className="mt-[var(--space-3)] text-[var(--color-text-secondary)]">
          Працівник із річним стажем не порушує регламенту — поступово
          коротшає вітання, зникає рекомендація, формальним стає прощання.
          Саме на цьому тримається вау-ефект, і саме це згасає першим. Тому
          навчання в системі не завершується курсом: щомісячний вебінар
          повертає прийоми турботи в роботу, а звітність показує, у кого
          рівень тримається, а кому час приділити увагу.
        </p>
      </div>
    </Section>
  );
}
