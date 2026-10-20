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
