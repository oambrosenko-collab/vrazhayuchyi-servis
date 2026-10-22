-- ============================================================
-- Webinars: the schedule, the archive, and the column the owner reads.
-- Every row must print PASS before a release.
--
-- What it protects:
--   · an unpublished webinar is invisible to everyone but the owner
--   · an expired restaurant loses the schedule with the rest of the content
--   · the join link disappears when the broadcast ends; the recording takes over
--   · a touch cannot be recorded for a link that was never handed out
--   · one restaurant never sees another's attendance
--   · the report counts only what happened while the person held a seat
--
--   supabase db execute --file supabase/tests/webinars.sql
-- Seeds inside a transaction and rolls back, so it leaves nothing behind.
-- ============================================================

begin;

create temp table r(check_name text, expected text, got text, ok boolean)
  on commit drop;
grant insert, select on r to authenticated, anon;

do $$
declare
  oa organizations; ob organizations; oexp organizations;
  ua   uuid := gen_random_uuid();  -- employee, org A, joined long ago
  unew uuid := gen_random_uuid();  -- employee, org A, joined today
  adm  uuid := gen_random_uuid();  -- org_admin, org A
  ub   uuid := gen_random_uuid();  -- employee, org B
  uex  uuid := gen_random_uuid();  -- employee, expired org
  w_past uuid; w_old uuid; w_live uuid; w_draft uuid;
  res record; n int; seen timestamptz;
begin
  oa   := app.provision_organization('Web A',   5, 'wa@t.invalid', 12);
  ob   := app.provision_organization('Web B',   5, 'wb@t.invalid', 12);
  oexp := app.provision_organization('Web Exp', 5, 'we@t.invalid', 12);
  update organizations set expires_at = now() - interval '1 day' where id = oexp.id;

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  select x.id, '00000000-0000-0000-0000-000000000000',
         'authenticated', 'authenticated', x.em, '', now(), now(), now()
  from (values (ua,'wa1@t.invalid'), (unew,'wa2@t.invalid'), (adm,'wadm@t.invalid'),
               (ub,'wb1@t.invalid'), (uex,'we1@t.invalid')) as x(id, em);

  insert into users (id, organization_id, email, full_name, role, status, joined_at)
  values (ua,   oa.id,   'wa1@t.invalid',  'A Emp',   'employee',  'active', now() - interval '6 months'),
         (unew, oa.id,   'wa2@t.invalid',  'A New',   'employee',  'active', now() - interval '1 day'),
         (adm,  oa.id,   'wadm@t.invalid', 'A Adm',   'org_admin', 'active', now() - interval '6 months'),
         (ub,   ob.id,   'wb1@t.invalid',  'B Emp',   'employee',  'active', now() - interval '6 months'),
         (uex,  oexp.id, 'we1@t.invalid',  'Exp Emp', 'employee',  'active', now() - interval '6 months');

  -- Four webinars: one last month with a recording, one half a year ago
  -- (outside the three-month window), one in progress, one unpublished.
  insert into webinars (title, starts_at, duration_min, join_url, recording_url, is_published)
  values ('Минулий ефір', now() - interval '20 days', 60,
          'https://zoom.test/past', 'https://rec.test/past', true)
  returning id into w_past;

  insert into webinars (title, starts_at, duration_min, join_url, recording_url, is_published)
  values ('Давній ефір', now() - interval '5 months', 60,
          'https://zoom.test/old', 'https://rec.test/old', true)
  returning id into w_old;

  insert into webinars (title, starts_at, duration_min, join_url, is_published)
  values ('Просто зараз', now() - interval '10 minutes', 60,
          'https://zoom.test/live', true)
  returning id into w_live;

  insert into webinars (title, starts_at, duration_min, join_url, is_published)
  values ('Чернетка', now() + interval '10 days', 60, 'https://zoom.test/draft', false)
  returning id into w_draft;

  -- ---------- employee of a healthy restaurant ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.webinar_feed();
  insert into r values ('feed hides the draft', '3', n::text, n = 3);

  select count(*) into n from public.webinar_feed() f where f.webinar_id = w_draft;
  insert into r values ('draft invisible to employee', '0', n::text, n = 0);

  select * into res from public.webinar_feed() f where f.webinar_id = w_past;
  insert into r values ('ended webinar hides join link', 'null',
                        coalesce(res.join_url, 'null'), res.join_url is null);
  insert into r values ('ended webinar keeps recording', 'url',
                        coalesce(res.recording_url, 'null'), res.recording_url is not null);
  insert into r values ('ended webinar is not upcoming', 'false',
                        res.is_upcoming::text, res.is_upcoming = false);

  select * into res from public.webinar_feed() f where f.webinar_id = w_live;
  insert into r values ('running webinar still joinable', 'url',
                        coalesce(res.join_url, 'null'), res.join_url is not null);

  -- a touch for a link that was never handed out is not a touch
  select * into res from public.record_webinar_touch(w_past, 'live');
  insert into r values ('live touch refused after the end', 'webinar_not_open',
                        res.out_reason, res.out_ok = false);

  select * into res from public.record_webinar_touch(w_draft, 'recording');
  insert into r values ('touch on draft refused', 'webinar_not_open',
                        res.out_reason, res.out_ok = false);

  select * into res from public.record_webinar_touch(w_live, 'recording');
  insert into r values ('recording touch refused without a recording',
                        'webinar_not_open', res.out_reason, res.out_ok = false);

  -- the real ones
  select * into res from public.record_webinar_touch(w_past, 'recording');
  insert into r values ('recording touch recorded', 'recorded', res.out_reason, res.out_ok);

  select * into res from public.record_webinar_touch(w_past, 'recording');
  select count(*) into n from webinar_touches t
   where t.webinar_id = w_past and t.user_id = ua and t.source = 'recording';
  insert into r values ('second open is still one touch', '1', n::text, n = 1);

  select * into res from public.record_webinar_touch(w_live, 'live');
  insert into r values ('live touch recorded while running', 'recorded',
                        res.out_reason, res.out_ok);

  select * into res from public.record_webinar_touch(w_old, 'recording');
  insert into r values ('old recording still openable', 'recorded',
                        res.out_reason, res.out_ok);

  select u.last_seen_at into seen from users u where u.id = ua;
  insert into r values ('touch counts as activity', 'now',
                        coalesce(seen::text, 'null'),
                        seen is not null and seen > now() - interval '1 minute');

  select count(*) into n from webinar_touches;
  insert into r values ('employee sees only own touches', '3', n::text, n = 3);

  -- ---------- expired restaurant ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', uex::text, 'role', 'authenticated')::text, true);

  select count(*) into n from public.webinar_feed();
  insert into r values ('expired org loses the schedule', '0', n::text, n = 0);

  select * into res from public.record_webinar_touch(w_live, 'live');
  insert into r values ('expired org cannot record a touch', 'no_access',
                        res.out_reason, res.out_ok = false);

  -- ---------- the other restaurant ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', ub::text, 'role', 'authenticated')::text, true);

  select count(*) into n from webinar_touches;
  insert into r values ('org B sees none of org A touches', '0', n::text, n = 0);

  select count(*) into n from public.team_report();
  insert into r values ('employee gets no team report', '0', n::text, n = 0);

  -- ---------- the admin who pays for the report ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', adm::text, 'role', 'authenticated')::text, true);

  select count(*) into n from webinar_touches;
  insert into r values ('admin sees own org touches', '3', n::text, n = 3);

  select * into res from public.team_report() t where t.user_id = ua;
  insert into r values ('report counts touches in window', '2',
                        res.webinars_touched::text, res.webinars_touched = 2);
  insert into r values ('report counts webinars held in window', '2',
                        res.webinars_held::text, res.webinars_held = 2);

  select * into res from public.team_report() t where t.user_id = unew;
  insert into r values ('newcomer counts only what ran after they joined', '1',
                        res.webinars_held::text, res.webinars_held = 1);
  insert into r values ('newcomer denominator is below the veteran''s', '1 < 2',
                        res.webinars_held::text, res.webinars_held = 1);

  -- ---------- writes stay closed ----------
  begin
    insert into webinars (title, starts_at) values ('hack', now());
    insert into r values ('direct webinar insert', 'blocked', 'succeeded', false);
  exception when insufficient_privilege then
    insert into r values ('direct webinar insert', 'blocked', 'permission denied', true);
  end;

  begin
    insert into webinar_touches (webinar_id, user_id, source)
    values (w_old, adm, 'live');
    insert into r values ('direct touch insert', 'blocked', 'succeeded', false);
  exception when insufficient_privilege then
    insert into r values ('direct touch insert', 'blocked', 'permission denied', true);
  end;

  begin
    perform public.su_save_webinar(null, 'hack', null, now(), 60, null, null, true);
    insert into r values ('admin cannot reach su_save_webinar', 'blocked',
                          'succeeded', false);
  exception when insufficient_privilege then
    insert into r values ('admin cannot reach su_save_webinar', 'blocked',
                          'permission denied', true);
  end;

  select count(*) into n from public.su_webinars();
  insert into r values ('admin gets nothing from su_webinars', '0', n::text, n = 0);

  reset role;
end $$;

select
  check_name,
  case when ok then 'PASS' else 'FAIL — got: ' || got end as result
from r
order by ok, check_name;

rollback;
