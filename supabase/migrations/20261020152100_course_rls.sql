-- ============================================================
-- Access to the course is a property of the organization, not the person.
-- When the twelve months run out the videos go dark — but the admin's
-- cabinet, the reports and the certificates stay, because a fully locked
-- account kills any chance of renewal.
-- ============================================================

create or replace function app.has_course_access()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1
    from users u
    join organizations o on o.id = u.organization_id
    where u.id = (select auth.uid())
      and u.status = 'active'
      and o.status in ('trial', 'active')
      and (o.expires_at is null or o.expires_at > now())
  );
$$;

revoke all on function app.has_course_access() from public, anon;
grant execute on function app.has_course_access() to authenticated;

alter table courses         enable row level security;
alter table modules         enable row level security;
alter table lessons         enable row level security;
alter table lesson_progress enable row level security;

alter table courses         force row level security;
alter table modules         force row level security;
alter table lessons         force row level security;
alter table lesson_progress force row level security;

revoke all on courses, modules, lessons, lesson_progress from anon, authenticated;
grant select on courses, modules, lessons, lesson_progress to authenticated;

-- ---------- content: published only, and only while access lasts ----------
create policy courses_read on courses
  for select to authenticated
  using (
    (is_published and (select app.has_course_access()))
    or (select app.is_superadmin())
  );

create policy modules_read on modules
  for select to authenticated
  using (
    exists (
      select 1 from courses c
      where c.id = modules.course_id
        and c.is_published
        and (select app.has_course_access())
    )
    or (select app.is_superadmin())
  );

create policy lessons_read on lessons
  for select to authenticated
  using (
    exists (
      select 1
      from modules m
      join courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and c.is_published
        and (select app.has_course_access())
    )
    or (select app.is_superadmin())
  );

-- ---------- progress ----------
-- Own rows stay readable after access expires: the employee should still
-- see what they finished, even when the videos are gone.
create policy lesson_progress_read_own on lesson_progress
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The restaurant's admin reads the team's progress — this is the report
-- they are paying for. Employees do not see each other's numbers.
create policy lesson_progress_read_org on lesson_progress
  for select to authenticated
  using (
    ((select app.is_org_admin()) or (select app.is_superadmin()))
    and exists (
      select 1 from users u
      where u.id = lesson_progress.user_id
        and u.organization_id = (select app.org_id())
    )
  );

create policy lesson_progress_read_superadmin on lesson_progress
  for select to authenticated
  using ((select app.is_superadmin()));
