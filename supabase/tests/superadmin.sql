-- ============================================================
-- The platform owner's area. Fifth companion test; every row must read
-- PASS before a release.
--
-- The important half is negative: an org_admin is the most privileged
-- customer-side role, and this is what proves they cannot reach the
-- platform's own functions — including the only one in the schema that
-- returns the quiz answer key.
--
--   supabase db execute --file supabase/tests/superadmin.sql
-- Seeds inside a transaction and rolls back.
-- ============================================================

begin;

create temp table r(check_name text, expected text, got text, ok boolean)
  on commit drop;
grant insert, select on r to authenticated, anon;

do $$
declare
  org organizations; other organizations;
  adm uuid := gen_random_uuid();   -- org_admin, must be refused
  su  uuid := gen_random_uuid();   -- superadmin
  emp uuid := gen_random_uuid();   -- employee, must be refused
  n int; res record; lid uuid; qid uuid; mid uuid; tmp uuid;
begin
  org   := app.provision_organization('SU Test A', 5, 'a@su.invalid', 12);
  other := app.provision_organization('SU Test B', 3, 'b@su.invalid', 12);

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  select x.id, '00000000-0000-0000-0000-000000000000',
         'authenticated', 'authenticated', x.em, '', now(), now(), now()
  from (values (adm,'a@su.invalid'), (su,'su@su.invalid'), (emp,'e@su.invalid'))
    as x(id, em);

  insert into users (id, organization_id, email, full_name, role, status)
  values (adm, org.id, 'a@su.invalid',  'Адмін',    'org_admin',  'active'),
         (emp, org.id, 'e@su.invalid',  'Офіціант', 'employee',   'active'),
         (su,  null,   'su@su.invalid', 'Власник',  'superadmin', 'active');

  select l.id into lid from lessons l limit 1;
  select q.id into qid from quizzes q where not q.is_final limit 1;
  select m.id into mid from modules m limit 1;

  -- preset the dates while still privileged
  update organizations set expires_at = now() + interval '100 days' where id = org.id;
  update organizations set expires_at = now() - interval '200 days', status = 'expired'
   where id = other.id;

  -- ---------- the restaurant's admin is refused everywhere ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', adm::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    select count(*) into n from public.su_overview();
    insert into r values ('org_admin calls su_overview','forbidden','returned '||n, false);
  exception when insufficient_privilege then
    insert into r values ('org_admin calls su_overview','forbidden','forbidden', true);
  end;
  begin
    select count(*) into n from public.su_organizations();
    insert into r values ('org_admin lists all restaurants','forbidden','returned '||n, false);
  exception when insufficient_privilege then
    insert into r values ('org_admin lists all restaurants','forbidden','forbidden', true);
  end;
  begin
    select count(*) into n from public.su_quiz_tree();
    insert into r values ('org_admin reads the answer key','forbidden','returned '||n, false);
  exception when insufficient_privilege then
    insert into r values ('org_admin reads the answer key','forbidden','forbidden', true);
  end;
  begin
    perform public.su_add_seats(org.id, 100);
    insert into r values ('org_admin grants itself seats','forbidden','succeeded', false);
  exception when insufficient_privilege then
    insert into r values ('org_admin grants itself seats','forbidden','forbidden', true);
  end;
  begin
    perform public.su_extend_access(org.id, 60);
    insert into r values ('org_admin extends own access','forbidden','succeeded', false);
  exception when insufficient_privilege then
    insert into r values ('org_admin extends own access','forbidden','forbidden', true);
  end;
  reset role;

  -- ---------- an employee likewise ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', emp::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    select count(*) into n from public.su_quiz_tree();
    insert into r values ('employee reads the answer key','forbidden','returned '||n, false);
  exception when insufficient_privilege then
    insert into r values ('employee reads the answer key','forbidden','forbidden', true);
  end;
  reset role;

  -- ---------- the owner ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', su::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.su_organizations();
  insert into r values ('owner sees every restaurant','>=2', n::text, n >= 2);

  select o.organizations_total into n from public.su_overview() o;
  insert into r values ('overview counts restaurants','>=2', n::text, n >= 2);

  select count(*) into n from public.su_quiz_tree() t where t.is_correct;
  insert into r values ('owner sees the answer key','>0', n::text, n > 0);

  -- the seat floor
  select * into res from public.su_add_seats(org.id, -10);
  insert into r values ('cannot shrink below seats in use','false', res.out_ok::text,
                        res.out_ok = false);
  select * into res from public.su_add_seats(org.id, 5);
  insert into r values ('adding seats works','10', res.out_package_size::text,
                        res.out_package_size = 10);

  -- renewing early must not cost the customer days
  select * into res from public.su_extend_access(org.id, 12);
  insert into r values ('renewing early keeps remaining days','>460',
    ceil(extract(epoch from (res.out_expires_at - now()))/86400)::text,
    ceil(extract(epoch from (res.out_expires_at - now()))/86400) > 460);

  select * into res from public.su_extend_access(other.id, 12);
  insert into r values ('lapsed access extends from today','~365',
    ceil(extract(epoch from (res.out_expires_at - now()))/86400)::text,
    ceil(extract(epoch from (res.out_expires_at - now()))/86400) between 360 and 370);

  select o.status into res from organizations o where o.id = other.id;
  insert into r values ('renewing revives an expired restaurant','active',
                        res.status::text, res.status::text = 'active');

  -- a question must keep exactly one correct option
  begin
    perform public.su_save_question(null, qid, 'Питання?', 'Тема',
      '[{"label":"а","is_correct":true},{"label":"б","is_correct":true}]'::jsonb);
    insert into r values ('two correct options rejected','error','accepted', false);
  exception when others then
    insert into r values ('two correct options rejected','error','rejected', true);
  end;
  begin
    perform public.su_save_question(null, qid, 'Питання?', 'Тема',
      '[{"label":"а","is_correct":false},{"label":"б","is_correct":false}]'::jsonb);
    insert into r values ('zero correct options rejected','error','accepted', false);
  exception when others then
    insert into r values ('zero correct options rejected','error','rejected', true);
  end;
  select * into res from public.su_save_question(null, qid, 'Нове питання?', 'Нова тема',
    '[{"label":"правильна","is_correct":true},{"label":"ні","is_correct":false}]'::jsonb);
  insert into r values ('valid question saved','true', res.out_ok::text, res.out_ok);
  reset role;

  -- ---------- deleting a watched lesson would erase a report ----------
  insert into lesson_progress (user_id, lesson_id, position_sec, watched_sec, completed_at)
  values (emp, lid, 10, 10, now());

  perform set_config('request.jwt.claims',
    json_build_object('sub', su::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select * into res from public.su_delete_lesson(lid);
  insert into r values ('watched lesson cannot be deleted','has_progress', res.out_reason,
                        res.out_reason = 'has_progress');

  select * into res from public.su_save_lesson(null, mid, 'Тимчасовий', null, 60, null);
  tmp := res.out_id;
  select * into res from public.su_delete_lesson(tmp);
  insert into r values ('unwatched lesson deletes','deleted', res.out_reason,
                        res.out_reason = 'deleted');
  reset role;

  -- ---------- the owner is not a learner ----------
  -- Attach the superadmin to the restaurant and check nothing counts them.
  update users set organization_id = org.id where id = su;

  perform set_config('request.jwt.claims',
    json_build_object('sub', adm::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select o.seats_taken into n from public.org_overview() o;
  insert into r values ('owner does not occupy a seat','2', n::text, n = 2);

  select count(*) into n from public.team_report() t where t.role = 'superadmin';
  insert into r values ('owner absent from the team report','0', n::text, n = 0);
  reset role;
end $$;

select
  check_name,
  case when ok then 'PASS' else 'FAIL — got: ' || got end as result
from r
order by ok, check_name;

rollback;
