-- ============================================================
-- The owner's report. Third companion to rls_isolation.sql and
-- course_access.sql; every row must read PASS before a release.
--
-- What it protects:
--   · the report never reaches across restaurants
--   · an employee cannot read their colleagues' numbers
--   · a released seat keeps its progress, which is the whole reason
--     freeing a seat is a status change and not a DELETE
--   · the percentage counts finished lessons against the whole course
--
--   supabase db execute --file supabase/tests/team_report.sql
-- Seeds inside a transaction and rolls back.
-- ============================================================

begin;

create temp table r(check_name text, expected text, got text, ok boolean)
  on commit drop;
grant insert, select on r to authenticated, anon;

do $$
declare
  oa organizations; ob organizations;
  adm  uuid := gen_random_uuid();  -- admin of restaurant A
  w1   uuid := gen_random_uuid();  -- employee who studied, then went quiet
  w2   uuid := gen_random_uuid();  -- released seat
  badm uuid := gen_random_uuid();  -- admin of restaurant B
  n int; tot int; pct int; rec record;
begin
  oa := app.provision_organization('Rep A', 5, 'adm@rep.invalid',  12);
  ob := app.provision_organization('Rep B', 5, 'badm@rep.invalid', 12);

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  select x.id, '00000000-0000-0000-0000-000000000000',
         'authenticated', 'authenticated', x.em, '', now(), now(), now()
  from (values (adm,'adm@rep.invalid'), (w1,'w1@rep.invalid'),
               (w2,'w2@rep.invalid'),   (badm,'badm@rep.invalid')) as x(id, em);

  insert into users (id, organization_id, email, full_name, role, status,
                     removed_at, joined_at)
  values
    (adm,  oa.id, 'adm@rep.invalid',  'Адмін А',       'org_admin', 'active',  null,  now() - interval '30 days'),
    (w1,   oa.id, 'w1@rep.invalid',   'Офіціант Один', 'employee',  'active',  null,  now() - interval '20 days'),
    (w2,   oa.id, 'w2@rep.invalid',   'Офіціант Два',  'employee',  'removed', now(), now() - interval '25 days'),
    (badm, ob.id, 'badm@rep.invalid', 'Адмін Б',       'org_admin', 'active',  null,  now());

  -- w1 finishes the first two lessons, then stops for nine days
  for rec in (select l.id as lid, l.duration_sec as d
              from lessons l join modules m on m.id = l.module_id
              order by m.order_index, l.order_index limit 2) loop
    insert into lesson_progress (user_id, lesson_id, position_sec, watched_sec, completed_at)
    values (w1, rec.lid, rec.d, rec.d, now());
  end loop;
  update users set last_seen_at = now() - interval '9 days' where id = w1;

  -- ---------- the admin of restaurant A ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', adm::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.team_report();
  insert into r values ('admin sees own team incl. released', '3', n::text, n = 3);

  select tr.percent, tr.lessons_done, tr.lessons_total into pct, n, tot
  from public.team_report() tr where tr.email = 'w1@rep.invalid';
  insert into r values ('finished lessons counted', '2', n::text, n = 2);
  insert into r values ('total is the whole published course', '8', tot::text, tot = 8);
  insert into r values ('percent = done / total', '25', pct::text, pct = 25);

  select count(*) into n from public.team_report() tr
   where tr.email = 'badm@rep.invalid';
  insert into r values ('other restaurant absent', '0', n::text, n = 0);

  select count(*) into n from public.team_report() tr where tr.status = 'removed';
  insert into r values ('released seat still reported', '1', n::text, n = 1);

  -- "stuck" is quiet for a week, and never-started counts as stuck
  select count(*) into n from public.team_report() tr
   where tr.status = 'active'
     and (tr.last_seen_at is null or tr.last_seen_at < now() - interval '7 days');
  insert into r values ('stuck list finds quiet and never-started', '2', n::text, n = 2);
  reset role;

  -- ---------- an employee must not get the report ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', w1::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.team_report();
  insert into r values ('employee gets an empty report', '0', n::text, n = 0);
  reset role;

  -- ---------- the admin of restaurant B ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', badm::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.team_report();
  insert into r values ('admin B sees only own team', '1', n::text, n = 1);
  reset role;
end $$;

select
  check_name,
  case when ok then 'PASS' else 'FAIL — got: ' || got end as result
from r
order by ok, check_name;

rollback;
