-- ============================================================
-- Course access and progress. The companion to rls_isolation.sql, and
-- the same rule applies: every row must read PASS before a release.
--
-- What it protects:
--   · an expired or suspended restaurant loses the videos, not the data
--   · a freed seat loses access the moment it is freed
--   · the 90% completion rule cannot be forged from the client
--   · one employee never sees another's progress; the admin sees the team
--
--   supabase db execute --file supabase/tests/course_access.sql
-- Seeds inside a transaction and rolls back, so it leaves nothing behind.
-- Still, run it on a branch rather than production.
-- ============================================================

begin;

create temp table r(check_name text, expected text, got text, ok boolean)
  on commit drop;
grant insert, select on r to authenticated, anon;

do $$
declare
  oa organizations; ob organizations; oexp organizations;
  ua   uuid := gen_random_uuid();  -- employee, org A
  ub   uuid := gen_random_uuid();  -- employee, org B
  adm  uuid := gen_random_uuid();  -- org_admin, org A
  uex  uuid := gen_random_uuid();  -- employee, expired org
  urem uuid := gen_random_uuid();  -- removed employee, org A
  les uuid; dur int; res record; n int; n2 int; ts timestamptz;
begin
  oa   := app.provision_organization('Prog A',   5, 'a@t.invalid', 12);
  ob   := app.provision_organization('Prog B',   5, 'b@t.invalid', 12);
  oexp := app.provision_organization('Prog Exp', 5, 'e@t.invalid', 12);
  update organizations set expires_at = now() - interval '1 day' where id = oexp.id;

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  select x.id, '00000000-0000-0000-0000-000000000000',
         'authenticated', 'authenticated', x.em, '', now(), now(), now()
  from (values (ua,'a@t.invalid'), (ub,'b@t.invalid'), (adm,'adm@t.invalid'),
               (uex,'e@t.invalid'), (urem,'rem@t.invalid')) as x(id, em);

  insert into users (id, organization_id, email, full_name, role, status, removed_at)
  values (ua,   oa.id,   'a@t.invalid',   'A Emp',   'employee',  'active',  null),
         (adm,  oa.id,   'adm@t.invalid', 'A Adm',   'org_admin', 'active',  null),
         (ub,   ob.id,   'b@t.invalid',   'B Emp',   'employee',  'active',  null),
         (uex,  oexp.id, 'e@t.invalid',   'Exp Emp', 'employee',  'active',  null),
         (urem, oa.id,   'rem@t.invalid', 'Rem Emp', 'employee',  'removed', now());

  select l.id, l.duration_sec into les, dur
  from lessons l join modules m on m.id = l.module_id
  where m.order_index = 0 and l.order_index = 0;

  -- ---------- employee of a healthy restaurant ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.course_outline();
  insert into r values ('course_outline returns the course', '>0', n::text, n > 0);

  -- an oversized delta is a scrub or a forged call, never real playback
  select * into res from public.save_lesson_progress(les, 30, 100000);
  insert into r values ('delta clamped to 15', '15', res.out_watched_sec::text,
                        res.out_watched_sec = 15);
  insert into r values ('not complete after 15s', 'false', res.out_completed::text,
                        res.out_completed = false);

  select * into res from public.save_lesson_progress(les, 999999, 0);
  select lp.position_sec into n from lesson_progress lp
   where lp.user_id = ua and lp.lesson_id = les;
  insert into r values ('position capped at duration', dur::text, n::text, n = dur);

  -- honest watching, one beat at a time, until the rule trips
  for i in 1..13 loop
    select * into res from public.save_lesson_progress(les, 100, 15);
  end loop;
  insert into r values ('completed at >=90%', 'true', res.out_completed::text,
                        res.out_completed = true);
  insert into r values ('watched never exceeds duration', '<=' || dur,
                        res.out_watched_sec::text, res.out_watched_sec <= dur);

  -- the date in the owner's report must not drift when someone rewatches
  select lp.completed_at into ts from lesson_progress lp
   where lp.user_id = ua and lp.lesson_id = les;
  perform pg_sleep(0.05);
  select * into res from public.save_lesson_progress(les, 10, 15);
  select count(*) into n from lesson_progress lp
   where lp.user_id = ua and lp.lesson_id = les and lp.completed_at = ts;
  insert into r values ('completed_at frozen on re-watch', '1', n::text, n = 1);

  select count(*) into n from lesson_progress;
  insert into r values ('employee sees only own progress', '1', n::text, n = 1);
  reset role;

  -- ---------- employee of another restaurant ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', ub::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from lesson_progress;
  insert into r values ('other restaurant sees no progress', '0', n::text, n = 0);
  -- content is shared on purpose; only progress is private
  select count(*) into n from public.course_outline();
  insert into r values ('other restaurant still sees the course', '>0', n::text, n > 0);
  reset role;

  -- ---------- the restaurant's admin ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', adm::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from lesson_progress;
  insert into r values ('admin reads the team progress', '1', n::text, n = 1);
  reset role;

  -- ---------- expired access ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', uex::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n  from lessons;
  select count(*) into n2 from public.course_outline();
  insert into r values ('expired: no lessons', '0', n::text, n = 0);
  insert into r values ('expired: empty outline', '0', n2::text, n2 = 0);
  select * into res from public.save_lesson_progress(les, 10, 5);
  insert into r values ('expired: cannot save progress', 'no_access', res.out_reason,
                        res.out_reason = 'no_access');
  reset role;

  -- ---------- a freed seat ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', urem::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from lessons;
  insert into r values ('released seat: no lessons', '0', n::text, n = 0);
  select * into res from public.save_lesson_progress(les, 10, 5);
  insert into r values ('released seat: cannot save', 'no_access', res.out_reason,
                        res.out_reason = 'no_access');
  reset role;

  -- ---------- no client write surface, same rule as step 1 ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update lesson_progress set completed_at = now() where user_id = ua;
    insert into r values ('direct progress update', 'blocked', 'succeeded', false);
  exception when insufficient_privilege then
    insert into r values ('direct progress update', 'blocked', 'permission denied', true);
  end;
  begin
    insert into lessons (module_id, title, duration_sec, order_index)
    select m.id, 'hack', 10, 99 from modules m limit 1;
    insert into r values ('direct lesson insert', 'blocked', 'succeeded', false);
  exception when insufficient_privilege then
    insert into r values ('direct lesson insert', 'blocked', 'permission denied', true);
  end;
  reset role;
end $$;

select
  check_name,
  case when ok then 'PASS' else 'FAIL — got: ' || got end as result
from r
order by ok, check_name;

rollback;
