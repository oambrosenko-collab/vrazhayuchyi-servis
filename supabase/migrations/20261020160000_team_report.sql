-- ============================================================
-- Step 3: the report the restaurant is actually paying for.
-- ============================================================

-- `last_seen_at` means the last time this person *learned something*, not
-- the last time they loaded a page. For the owner, "hasn't watched
-- anything in a week" is the actionable signal; "logged in and bounced"
-- is not. Stamped from the one write that already happens per beat, so
-- it costs nothing extra.
create or replace function public.save_lesson_progress(
  p_lesson_id    uuid,
  p_position_sec int,
  p_delta_sec    int default 0
)
returns table (
  out_ok          boolean,
  out_reason      text,
  out_watched_sec int,
  out_completed   boolean
)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_duration int;
  v_delta    int;
  v_position int;
  v_watched  int;
  v_done     boolean;
begin
  if v_uid is null then
    return query select false, 'not_authenticated', 0, false; return;
  end if;

  if not (select app.has_course_access()) then
    return query select false, 'no_access', 0, false; return;
  end if;

  select l.duration_sec into v_duration
  from lessons l
  where l.id = p_lesson_id
    and exists (
      select 1 from modules m join courses c on c.id = m.course_id
      where m.id = l.module_id and c.is_published
    );

  if v_duration is null then
    return query select false, 'lesson_not_found', 0, false; return;
  end if;

  v_delta    := least(greatest(coalesce(p_delta_sec, 0), 0), 15);
  v_position := least(greatest(coalesce(p_position_sec, 0), 0), v_duration);

  insert into lesson_progress (user_id, lesson_id, position_sec, watched_sec)
  values (v_uid, p_lesson_id, v_position, least(v_delta, v_duration))
  on conflict (user_id, lesson_id) do update
    set position_sec = v_position,
        watched_sec  = least(lesson_progress.watched_sec + v_delta, v_duration)
  returning watched_sec into v_watched;

  v_done := v_watched >= ceil(v_duration * app.completion_ratio());

  if v_done then
    update lesson_progress lp
       set completed_at = coalesce(lp.completed_at, now())
     where lp.user_id = v_uid and lp.lesson_id = p_lesson_id;
  end if;

  -- Only count a beat that carried real playback. A paused tab must not
  -- keep someone looking active in the owner's report.
  if v_delta > 0 then
    update users u set last_seen_at = now() where u.id = v_uid;
  end if;

  return query select true, 'saved', v_watched, v_done;
end;
$$;

revoke all on function public.save_lesson_progress(uuid, int, int) from public, anon;
grant execute on function public.save_lesson_progress(uuid, int, int) to authenticated;

-- ------------------------------------------------------------
-- One row per person who has ever held a seat, active and released
-- alike. The released ones keep their numbers — that is the point of
-- never deleting them.
-- ------------------------------------------------------------
create or replace function public.team_report()
returns table (
  user_id       uuid,
  full_name     text,
  email         text,
  role          user_role,
  status        user_status,
  joined_at     timestamptz,
  removed_at    timestamptz,
  last_seen_at  timestamptz,
  lessons_done  int,
  lessons_total int,
  percent       int
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
  )
  select
    u.id, u.full_name, u.email, u.role, u.status,
    u.joined_at, u.removed_at, u.last_seen_at,
    coalesce(d.n, 0),
    total.n,
    case when total.n = 0 then 0
         else floor(100.0 * coalesce(d.n, 0) / total.n)::int end
  from users u
  cross join total
  left join lateral (
    select count(*)::int as n
    from lesson_progress lp
    where lp.user_id = u.id and lp.completed_at is not null
  ) d on true
  where u.organization_id = (select app.org_id())
    and ((select app.is_org_admin()) or (select app.is_superadmin()))
  order by (u.status = 'removed'), u.joined_at;
$$;

revoke all on function public.team_report() from public, anon;
grant execute on function public.team_report() to authenticated;
