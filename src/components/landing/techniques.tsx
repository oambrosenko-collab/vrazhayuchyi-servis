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
    title: "Прочитати стіл за перші тридцять секунд",
    body: "Побачення, ділова зустріч і родина з дитиною потребують різного темпу подачі. Офіціант, який це зчитує, не зникає й не заважає.",
  },
  {
    title: "Рекомендація, яка звучить послугою",
    body: "Не «візьміть ще десерт», а одна точна фраза про те, що справді пасує до замовленого. Це одночасно середній чек і враження.",
  },
  {
    title: "Затримка, про яку гість дізнається від вас",
    body: "Гість прощає чекання, якщо почув про нього від офіціанта раніше, ніж помітив сам. І не прощає, якщо навпаки.",
  },
  {
    title: "Постійний гість, якого впізнали",
    body: "Ім'я, улюблений столик, що замовляв минулого разу. Найдешевший спосіб зробити візит особистим — і найчастіше забутий.",
  },
  {
    title: "Прощання, яке не проковтують",
    body: "Останні десять секунд визначають, яким візит згадають завтра. Саме на них економлять, коли зал повний.",
  },
];

export function Techniques() {
  return (
    <Section className="border-t border-[var(--color-border)]">
      <SectionHead
        label="Чого вчимо"
        title="Не «покращити сервіс», а конкретні дії за столом"
        lead="«Покращити сервіс» неможливо доручити: під цим кожен у команді розуміє щось своє. Доручити можна дію — що саме сказати, коли страва затримується, і як попрощатися, щоб це запам'яталось. Ось що розбирається на курсі й на щомісячних ефірах."
      />

      <ul className="grid gap-[var(--space-6)] sm:grid-cols-2">
        {TECHNIQUES.map((t) => (
          <li
            key={t.title}
            className="border-l border-[var(--color-border-strong)] pl-[var(--space-4)]"
          >
            <h3 className="text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
              {t.title}
            </h3>
            <p className="mt-[var(--space-1)] text-[var(--color-text-secondary)]">
              {t.body}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-[var(--space-8)] max-w-[44rem] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        Теми вебінарів складаються з того, що приносять самі заклади, — тому
        через рік це вже не загальний курс сервісу, а розбір ситуацій із ваших
        залів.
      </p>
    </Section>
  );
}
