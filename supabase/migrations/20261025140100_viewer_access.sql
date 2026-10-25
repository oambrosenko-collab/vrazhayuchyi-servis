-- ============================================================
-- Step 6: the demo viewer.
--
-- A single global link (`view_invites`, one row, no org scope — the
-- owner is not multi-tenant yet, there is one demo organization) that
-- anyone can open repeatedly. Claiming it creates or re-enters a
-- `viewer` row attached to the superadmin's own organization, which is
-- what lets it ride every existing org-scoped policy (`app.org_id()`
-- does not check role) without new plumbing there.
--
-- The one thing that does need checking everywhere is the superadmin-
-- only read surface: `app.is_superadmin_or_viewer()` is the read-side
-- twin of `app.is_superadmin()`, used only in SELECT policies and in
-- the su_* read RPCs below. Nothing that guards a write — not
-- `app.require_superadmin()`, not a single `su_save_*` / `su_delete_*`
-- / `su_set_*` RPC — is touched, so a viewer has no path to mutate
-- anything: every write function still calls the original, narrower
-- `app.is_superadmin()` and raises `forbidden` for a viewer exactly as
-- it would for an employee.
-- ============================================================

create or replace function app.is_superadmin_or_viewer()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from users
    where id = (select auth.uid())
      and role in ('superadmin', 'viewer')
      and status = 'active'
  );
$$;

revoke all on function app.is_superadmin_or_viewer() from public, anon;
grant execute on function app.is_superadmin_or_viewer() to authenticated;

-- ---------------- su_* read RPCs: swap the guard ----------------

create or replace function public.su_overview()
returns table (
  organizations_total  int,
  organizations_active int,
  seats_sold           int,
  seats_taken          int,
  learners_active      int,
  learners_finished    int,
  avg_percent          int,
  certificates_issued  int,
  lessons_total        int,
  quizzes_total        int
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare v_lessons int;
begin
  if not (select app.is_superadmin_or_viewer()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*)::int into v_lessons
  from lessons l
  join modules m on m.id = l.module_id
  join courses c on c.id = m.course_id
  where c.is_published;

  return query
  with learner as (
    select
      u.id,
      case when v_lessons = 0 then 0
           else floor(100.0 * (
             select count(*) from lesson_progress lp
             where lp.user_id = u.id and lp.completed_at is not null
           ) / v_lessons)::int
      end as pct
    from users u
    where u.status = 'active'
      and u.role <> 'superadmin'
      and u.organization_id is not null
  )
  select
    (select count(*)::int from organizations),
    (select count(*)::int from organizations o
      where o.status in ('trial','active')
        and (o.expires_at is null or o.expires_at > now())),
    coalesce((select sum(o.package_size)::int from organizations o), 0),
    (select count(*)::int from users u where u.status = 'active'
       and u.organization_id is not null),
    (select count(*)::int from learner),
    (select count(*)::int from learner where v_lessons > 0 and pct >= 100),
    coalesce((select round(avg(pct))::int from learner), 0),
    (select count(*)::int from certificates),
    v_lessons,
    (select count(*)::int from quizzes);
end;
$$;

create or replace function public.su_organizations()
returns table (
  id               uuid,
  name             text,
  admin_email      text,
  package_size     int,
  seats_taken      int,
  activation       int,
  avg_percent      int,
  cumulative_users int,
  status           org_status,
  expires_at       timestamptz,
  days_left        int,
  created_at       timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare v_lessons int;
begin
  if not (select app.is_superadmin_or_viewer()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*)::int into v_lessons
  from lessons l
  join modules m on m.id = l.module_id
  join courses c on c.id = m.course_id
  where c.is_published;

  return query
  select
    o.id, o.name, o.admin_email, o.package_size,
    t.taken,
    case when o.package_size = 0 then 0
         else round(100.0 * t.taken / o.package_size)::int end,
    coalesce(p.avg_pct, 0),
    c.total,
    o.status,
    o.expires_at,
    case when o.expires_at is null then null
         else ceil(extract(epoch from (o.expires_at - now())) / 86400)::int end,
    o.created_at
  from organizations o
  cross join lateral (
    select count(*)::int as taken from users u
    where u.organization_id = o.id and u.status = 'active'
      and u.role <> 'superadmin'
  ) t
  cross join lateral (
    select count(*)::int as total from users u
    where u.organization_id = o.id and u.role <> 'superadmin'
  ) c
  cross join lateral (
    select round(avg(
      case when v_lessons = 0 then 0
           else floor(100.0 * (
             select count(*) from lesson_progress lp
             where lp.user_id = u.id and lp.completed_at is not null
           ) / v_lessons)
      end
    ))::int as avg_pct
    from users u
    where u.organization_id = o.id and u.status = 'active'
      and u.role <> 'superadmin'
  ) p
  order by o.created_at desc;
end;
$$;

create or replace function public.su_course_tree()
returns table (
  course_id      uuid,
  course_title   text,
  course_slug    text,
  is_published   boolean,
  module_id      uuid,
  module_title   text,
  module_summary text,
  module_order   int,
  lesson_id      uuid,
  lesson_title   text,
  lesson_desc    text,
  lesson_order   int,
  duration_sec   int,
  bunny_video_id text
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not (select app.is_superadmin_or_viewer()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    c.id, c.title, c.slug, c.is_published,
    m.id, m.title, m.summary, m.order_index,
    l.id, l.title, l.description, l.order_index, l.duration_sec, l.bunny_video_id
  from courses c
  left join modules m on m.course_id = c.id
  left join lessons l on l.module_id = m.id
  order by m.order_index nulls last, l.order_index nulls last;
end;
$$;

create or replace function public.su_quiz_tree()
returns table (
  quiz_id      uuid,
  quiz_title   text,
  module_id    uuid,
  module_title text,
  pass_score   int,
  is_final     boolean,
  question_id  uuid,
  prompt       text,
  topic        text,
  question_order int,
  option_id    uuid,
  label        text,
  is_correct   boolean,
  option_order int
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not (select app.is_superadmin_or_viewer()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    q.id, q.title, q.module_id, m.title, q.pass_score, q.is_final,
    qq.id, qq.prompt, qq.topic, qq.order_index,
    qo.id, qo.label, qo.is_correct, qo.order_index
  from quizzes q
  left join modules m         on m.id = q.module_id
  left join quiz_questions qq on qq.quiz_id = q.id
  left join quiz_options qo   on qo.question_id = qq.id
  order by q.is_final, m.order_index nulls last,
           qq.order_index nulls last, qo.order_index nulls last;
end;
$$;

create or replace function public.su_webinars()
returns table (
  webinar_id        uuid,
  title             text,
  description       text,
  starts_at         timestamptz,
  duration_min      int,
  join_url          text,
  recording_url     text,
  is_published      boolean,
  touched_live      int,
  touched_recording int
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    w.id, w.title, w.description, w.starts_at, w.duration_min,
    w.join_url, w.recording_url, w.is_published,
    coalesce(l.n, 0), coalesce(r.n, 0)
  from webinars w
  left join lateral (
    select count(*)::int as n from webinar_touches t
    where t.webinar_id = w.id and t.source = 'live'
  ) l on true
  left join lateral (
    select count(*)::int as n from webinar_touches t
    where t.webinar_id = w.id and t.source = 'recording'
  ) r on true
  where (select app.is_superadmin_or_viewer())
  order by w.starts_at desc;
$$;

-- ---------------- team_report: admin cabinet ----------------
-- Latest shape per 20261022150200_webinars_in_report_and_su.sql — this
-- redefinition must match it column-for-column or Postgres refuses the
-- swap ("cannot change return type of existing function").

create or replace function public.team_report()
returns table (
  user_id          uuid,
  full_name        text,
  email            text,
  role             user_role,
  status           user_status,
  joined_at        timestamptz,
  removed_at       timestamptz,
  last_seen_at     timestamptz,
  lessons_done     int,
  lessons_total    int,
  percent          int,
  webinars_touched int,
  webinars_held    int
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with total as (
    select count(*)::int as n
    from lessons l
    join modules m on m.id = l.module_id
    join courses c on c.id = m.course_id
    where c.is_published
  ),
  held as (
    select w.id, w.starts_at
    from webinars w
    where w.is_published
      and w.starts_at <= now()
      and w.starts_at > now() - interval '3 months'
  )
  select
    u.id, u.full_name, u.email, u.role, u.status,
    u.joined_at, u.removed_at, u.last_seen_at,
    coalesce(d.n, 0),
    total.n,
    case when total.n = 0 then 0
         else floor(100.0 * coalesce(d.n, 0) / total.n)::int end,
    coalesce(wt.n, 0),
    coalesce(wh.n, 0)
  from users u
  cross join total
  left join lateral (
    select count(*)::int as n
    from lesson_progress lp
    where lp.user_id = u.id and lp.completed_at is not null
  ) d on true
  left join lateral (
    select count(*)::int as n
    from held h
    where h.starts_at >= u.joined_at
  ) wh on true
  left join lateral (
    select count(distinct t.webinar_id)::int as n
    from webinar_touches t
    join held h on h.id = t.webinar_id
    where t.user_id = u.id
      and h.starts_at >= u.joined_at
  ) wt on true
  where u.organization_id = (select app.org_id())
    and ((select app.is_org_admin()) or (select app.is_superadmin_or_viewer()))
  order by (u.status = 'removed'), u.joined_at;
$$;

revoke all on function public.team_report() from public, anon;
grant execute on function public.team_report() to authenticated;

-- ---------------- quiz & webinar RLS: org-wide read for viewer ----------------

drop policy if exists quizzes_read on quizzes;
create policy quizzes_read on quizzes
  for select to authenticated
  using (
    exists (
      select 1 from courses c
      where c.id = quizzes.course_id
        and c.is_published
        and (select app.has_course_access())
    )
    or (select app.is_superadmin_or_viewer())
  );

drop policy if exists quiz_attempts_read_org on quiz_attempts;
create policy quiz_attempts_read_org on quiz_attempts
  for select to authenticated
  using (
    ((select app.is_org_admin()) or (select app.is_superadmin_or_viewer()))
    and exists (
      select 1 from users u
      where u.id = quiz_attempts.user_id
        and u.organization_id = (select app.org_id())
    )
  );

drop policy if exists certificates_read_org on certificates;
create policy certificates_read_org on certificates
  for select to authenticated
  using (
    ((select app.is_org_admin()) or (select app.is_superadmin_or_viewer()))
    and exists (
      select 1 from users u
      where u.id = certificates.user_id
        and u.organization_id = (select app.org_id())
    )
  );

drop policy if exists webinars_read on webinars;
create policy webinars_read on webinars
  for select to authenticated
  using (
    (is_published and (select app.has_course_access()))
    or (select app.is_superadmin_or_viewer())
  );

drop policy if exists webinar_touches_read_org on webinar_touches;
create policy webinar_touches_read_org on webinar_touches
  for select to authenticated
  using (
    ((select app.is_org_admin()) or (select app.is_superadmin_or_viewer()))
    and exists (
      select 1 from users u
      where u.id = webinar_touches.user_id
        and u.organization_id = (select app.org_id())
    )
  );

drop policy if exists webinar_touches_read_superadmin on webinar_touches;
create policy webinar_touches_read_superadmin on webinar_touches
  for select to authenticated
  using ((select app.is_superadmin_or_viewer()));

-- ---------------- the link itself ----------------

-- One row, one token, global — not per-organization like the employee
-- invite, because this link is not inviting anyone into a specific
-- restaurant's seat count. No client ever reads this table directly:
-- lookup_view_invite() and claim_view_access() below are the only door.
create table public.view_invites (
  token      text primary key default app.new_invite_token(),
  created_at timestamptz not null default now()
);

alter table public.view_invites enable row level security;
alter table public.view_invites force row level security;
revoke all on public.view_invites from anon, authenticated;

insert into public.view_invites default values;

create or replace function public.lookup_view_invite(p_token text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from view_invites where token = p_token);
$$;

revoke all on function public.lookup_view_invite(text) from public;
grant execute on function public.lookup_view_invite(text) to anon, authenticated;

create or replace function public.claim_view_access(p_token text, p_full_name text)
returns table (out_ok boolean, out_reason text, out_role user_role)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text;
  v_name  text := btrim(p_full_name);
  v_org   uuid;
  existing users;
begin
  if v_uid is null then
    return query select false, 'not_authenticated', null::user_role; return;
  end if;

  if not exists (select 1 from view_invites where token = p_token) then
    return query select false, 'invalid_link', null::user_role; return;
  end if;

  if length(v_name) < 2 or length(v_name) > 120 then
    return query select false, 'bad_name', null::user_role; return;
  end if;

  select au.email into v_email from auth.users au where au.id = v_uid;
  select * into existing from users u where u.id = v_uid;

  -- A real account — owner, a restaurant's admin, an employee — keeps
  -- whatever access it already has. The link only ever creates or
  -- re-enters the read-only viewer, never touches a real one.
  if existing.id is not null and existing.role <> 'viewer' then
    return query select true, 'already_member', existing.role; return;
  end if;

  select organization_id into v_org from users
  where role = 'superadmin' and organization_id is not null
  limit 1;

  if v_org is null then
    return query select false, 'no_demo_org', null::user_role; return;
  end if;

  if existing.id is not null then
    update users u set
      organization_id = v_org,
      full_name        = v_name,
      email            = coalesce(v_email, existing.email),
      status           = 'active',
      removed_at       = null,
      role             = 'viewer'
    where u.id = v_uid;
  else
    insert into users (id, organization_id, email, full_name, role, status)
    values (v_uid, v_org, v_email, v_name, 'viewer', 'active');
  end if;

  return query select true, 'joined', 'viewer'::user_role;
end;
$$;

revoke all on function public.claim_view_access(text, text) from public, anon;
grant execute on function public.claim_view_access(text, text) to authenticated;
