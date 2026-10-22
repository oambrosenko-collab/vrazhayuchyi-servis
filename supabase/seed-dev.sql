-- Local development seed. One restaurant, one course, one demo team.
--
-- There is deliberately no password account here. An earlier version seeded
-- one to work around email delivery, which meant a working credential for a
-- live project sitting in a public repo — the publishable key is public by
-- design, so that combination is an open door. Sign in with the magic link
-- instead; it works end to end.
--
-- `admin_email` is what matters below: the first person to join with that
-- address becomes org_admin automatically and lands in /admin rather than
-- /learn. Point it at your own inbox.

-- ------------------------------------------------------------
-- 1. The restaurant
-- ------------------------------------------------------------
select
  o.name,
  'http://localhost:3000/join/' || o.invite_token as invite_url,
  o.expires_at::date as access_until
from app.provision_organization(
  'Кав''ярня «Тераса»',   -- name
  10,                      -- seats
  'you@example.com',       -- admin_email — replace with your own
  12                       -- months of access
) o;

-- ------------------------------------------------------------
-- 2. The course
-- Placeholder titles that follow the PRD's premise — service on the
-- floor — so the screens read like the real thing while nothing is filmed.
-- ------------------------------------------------------------
with c as (
  insert into courses (slug, title, description, is_published)
  values ('servis-u-zali',
          'Вражаючий сервіс у залі',
          'Базовий курс для офіціантів, хостес і барменів. Уроки по 3–7 хвилин.',
          true)
  returning id
),
m as (
  insert into modules (course_id, title, summary, order_index)
  select c.id, t.title, t.summary, t.ord
  from c, (values
    (0, 'Перша хвилина гостя',   'Зустріч, посадка, перше враження'),
    (1, 'Робота із замовленням', 'Рекомендації, уточнення, темп подачі'),
    (2, 'Складні ситуації',      'Скарга, помилка кухні, конфлікт за столом')
  ) as t(ord, title, summary)
  returning id, order_index
)
insert into lessons (module_id, title, description, duration_sec, order_index)
select m.id, l.title, l.descr, l.dur, l.ord
from m, lateral (values
  (0, 0, 'Погляд і привітання',        'Чому перші сім секунд вирішують усе',  210),
  (0, 1, 'Посадка і меню',             'Як садити й коли давати меню',         260),
  (0, 2, 'Вода, хліб, перший контакт', 'Дрібниці, які помічають',              180),
  (1, 0, 'Як рекомендувати',           'Не «що будете?», а конкретна порада',  300),
  (1, 1, 'Уточнення й алергії',        'Питання, які рятують вечір',           240),
  (1, 2, 'Темп подачі',                'Коли виносити й коли зачекати',        270),
  (2, 0, 'Гість незадоволений',        'Перша реакція, якої не вчать',         330),
  (2, 1, 'Помилка кухні',              'Як сказати правду й не втратити гостя', 290)
) as l(mod_ord, ord, title, descr, dur)
where m.order_index = l.mod_ord;

-- ------------------------------------------------------------
-- 3. A demo team
--
-- An empty report shows nothing, so the spread here is deliberate: one
-- person finished, one is mid-course, one stalled twelve days ago, one
-- never started, and one seat was released with its progress intact.
-- Those are the five states the owner's dashboard has to describe.
--
-- Addresses end in .invalid (RFC 2606) so none of this can ever reach a
-- real inbox. Delete with:
--   delete from auth.users where email like '%@demo.invalid';
-- ------------------------------------------------------------
do $$
declare
  org uuid;
  ids    uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                         gen_random_uuid(), gen_random_uuid()];
  names  text[] := array['Марина Коваль','Тарас Бондар','Юлія Шевчук',
                         'Артем Лисенко','Ігор Мельник'];
  emails text[] := array['maryna@demo.invalid','taras@demo.invalid',
                         'yuliia@demo.invalid','artem@demo.invalid',
                         'ihor@demo.invalid'];
  joined int[]  := array[26, 21, 14, 9, 30];    -- days ago
  seen   int[]  := array[0, 2, 12, null, 20];   -- days ago, null = never
  done   int[]  := array[8, 5, 2, 0, 3];        -- lessons completed
  st     text[] := array['active','active','active','active','removed'];
  i int; k int; rec record;
begin
  select o.id into org from organizations o where o.name = 'Кав''ярня «Тераса»';

  for i in 1..5 loop
    -- GoTrue wants these token columns as '' rather than NULL, otherwise
    -- every sign-in fails with "Database error querying schema".
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new,
                            email_change_token_current, email_change, phone_change,
                            phone_change_token, reauthentication_token)
    values (ids[i], '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', emails[i], '', now(), now(), now(),
            '', '', '', '', '', '', '', '');

    insert into users (id, organization_id, email, full_name, role, status,
                       joined_at, removed_at, last_seen_at)
    values (ids[i], org, emails[i], names[i], 'employee', st[i]::user_status,
            now() - make_interval(days => joined[i]),
            case when st[i] = 'removed' then now() - interval '4 days' end,
            case when seen[i] is null then null
                 else now() - make_interval(days => seen[i]) end);

    k := 0;
    for rec in (select l.id as lid, l.duration_sec as d
                from lessons l join modules m on m.id = l.module_id
                order by m.order_index, l.order_index) loop
      exit when k >= done[i];
      insert into lesson_progress (user_id, lesson_id, position_sec, watched_sec, completed_at)
      values (ids[i], rec.lid, rec.d, rec.d,
              now() - make_interval(days => greatest(coalesce(seen[i], 30), 1)));
      k := k + 1;
    end loop;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4. Quizzes
--
-- Four questions per module and five in the final, each with one correct
-- option and two plausible wrong ones. The correct option is always
-- order_index 0 here purely because the seed is written that way — the
-- sheet RPC shuffles questions and never reveals which option is right,
-- so nothing in the app depends on that ordering.
-- ------------------------------------------------------------
do $$
declare
  cid uuid; qid uuid; qq uuid; m record; i int; item jsonb;
  -- [prompt, topic, correct, wrong, wrong]
  bank jsonb := '{
    "0": [
      ["Скільки секунд вирішують перше враження гостя?","Перша хвилина","Близько семи","Близько тридцяти","Хвилина і більше"],
      ["Коли подавати меню?","Посадка","Після того, як гість сів і роздягнувся","Одразу на вході","Коли гість попросить"],
      ["Що робити, якщо всі столи зайняті?","Зустріч","Назвати час очікування й запропонувати бар","Сказати, що місць немає","Мовчки чекати"],
      ["Навіщо приносити воду без запиту?","Перший контакт","Це знімає паузу й показує увагу","Щоб збільшити чек","Так прийнято скрізь"]
    ],
    "1": [
      ["Як правильно рекомендувати страву?","Рекомендації","Назвати конкретну й пояснити чому","Запитати «що будете?»","Порадити найдорожче"],
      ["Що обовʼязково уточнити перед відправкою замовлення?","Уточнення","Алергії та непереносимість","Спосіб оплати","Чи є знижка"],
      ["Коли виносити гарячу страву?","Темп подачі","Коли гість доїв попередню","Одразу як готово","Разом з усім замовленням"],
      ["Гість вагається між двома стравами. Що робити?","Рекомендації","Коротко порівняти й порадити одну","Сказати «обидві смачні»","Залишити думати"]
    ],
    "2": [
      ["Перша реакція на скаргу гостя?","Скарга","Вислухати й подякувати, що сказав","Пояснити, що він не правий","Одразу кликати управляючого"],
      ["Кухня помилилася зі стравою. Що сказати?","Помилка кухні","Визнати помилку й назвати час виправлення","Сказати, що так і має бути","Промовчати й замінити тихо"],
      ["Гість підвищує голос. Що робити?","Конфлікт","Знизити власний тон і відвести розмову вбік","Відповісти так само","Піти й не повертатись"],
      ["Що не можна казати гостю ніколи?","Скарга","«Це не моя зона відповідальності»","«Зараз розберусь»","«Дякую, що сказали»"]
    ]
  }'::jsonb;
  finals jsonb := '[
    ["Що робить сервіс передбачуваним?","Стандарт","Однаковий стандарт у всіх, хто говорить із гостем","Досвід окремого офіціанта","Розмір чайових"],
    ["Коли гість уперше оцінює заклад?","Перша хвилина","У перші секунди після входу","Коли приносять рахунок","Після першої страви"],
    ["Найкраща реакція на помилку закладу?","Помилка кухні","Визнати, вибачитись і дати конкретне рішення","Знижка без пояснень","Аргументувати, чому так сталось"],
    ["Що важливіше за швидкість подачі?","Темп подачі","Відповідність темпу гостя","Кількість страв за раз","Порядок у чеку"],
    ["Навіщо уточнювати алергії?","Уточнення","Це питання безпеки гостя","Щоб збільшити чек","Так швидше оформити замовлення"]
  ]'::jsonb;
begin
  select c.id into cid from courses c where c.is_published limit 1;

  for m in (select mo.id, mo.order_index, mo.title from modules mo
            where mo.course_id = cid order by mo.order_index) loop
    insert into quizzes (course_id, module_id, title, pass_score, is_final)
    values (cid, m.id, 'Тест: ' || m.title, 80, false)
    returning id into qid;

    i := 0;
    for item in select * from jsonb_array_elements(bank -> m.order_index::text) loop
      insert into quiz_questions (quiz_id, prompt, topic, order_index)
      values (qid, item->>0, item->>1, i) returning id into qq;
      insert into quiz_options (question_id, label, is_correct, order_index)
      values (qq, item->>2, true, 0), (qq, item->>3, false, 1), (qq, item->>4, false, 2);
      i := i + 1;
    end loop;
  end loop;

  insert into quizzes (course_id, module_id, title, pass_score, is_final)
  values (cid, null, 'Фінальний тест', 80, true) returning id into qid;

  i := 0;
  for item in select * from jsonb_array_elements(finals) loop
    insert into quiz_questions (quiz_id, prompt, topic, order_index)
    values (qid, item->>0, item->>1, i) returning id into qq;
    insert into quiz_options (question_id, label, is_correct, order_index)
    values (qq, item->>2, true, 0), (qq, item->>3, false, 1), (qq, item->>4, false, 2);
    i := i + 1;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4. Webinars — the monthly rhythm the annual price rests on.
--
-- Three states the screens have to handle: a past broadcast with its
-- recording, a past one whose recording is not up yet, and the next date
-- in the schedule. Links point at the reserved .test TLD, which never
-- resolves — nothing here pretends to be a real room.
--
-- Unlike the course, webinars carry no organization_id: publishing one
-- shows it to every venue with live access. That is the product working
-- as designed, and also the reason to clear these before a real customer:
--   delete from webinars where title like '[demo]%';
-- ------------------------------------------------------------
insert into webinars (title, description, starts_at, duration_min,
                      join_url, recording_url, is_published)
values
  ('[demo] Як прочитати стіл за перші тридцять секунд',
   'Побачення, ділова зустріч і родина з дитиною потребують різного темпу подачі. Розбираємо на записах із залу.',
   date_trunc('hour', now()) - interval '23 days', 60,
   'https://zoom.test/j/read-the-table', 'https://zoom.test/rec/read-the-table', true),

  ('[demo] Рекомендація, яка звучить послугою',
   'Одна точна фраза замість «візьміть ще десерт». Як це впливає на чек і на враження.',
   date_trunc('hour', now()) - interval '4 days', 60,
   'https://zoom.test/j/recommendation', null, true),

  ('[demo] Коли страва затрималась',
   'Гість прощає чекання, якщо почув про нього від офіціанта раніше, ніж помітив сам.',
   -- 19:00 Kyiv, not 19:00 UTC: the session zone here is UTC, and a
   -- broadcast is announced in the time the waiter actually reads.
   (date_trunc('day', now() at time zone 'Europe/Kyiv')
     + interval '12 days' + interval '19 hours') at time zone 'Europe/Kyiv', 60,
   'https://zoom.test/j/late-dish', null, true);
