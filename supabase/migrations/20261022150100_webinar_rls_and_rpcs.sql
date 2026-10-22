-- ============================================================
-- Step 5b: who may read the schedule, and how a touch is recorded.
--
-- Same shape as the course: reads go through policies, writes go through
-- RPCs that re-check the caller. The archive goes dark with the rest of
-- the content when the twelve months run out — the admin cabinet and the
-- report stay, because a fully locked account kills renewal.
-- ============================================================

alter table webinars       enable row level security;
alter table webinar_touches enable row level security;
alter table webinars       force row level security;
alter table webinar_touches force row level security;

revoke all on webinars, webinar_touches from anon, authenticated;
grant select on webinars, webinar_touches to authenticated;

create policy webinars_read on webinars
  for select to authenticated
  using (
    (is_published and (select app.has_course_access()))
    or (select app.is_superadmin())
  );

-- Own touches stay readable after access expires, like lesson progress:
-- the person should still see what they attended when the videos are gone.
create policy webinar_touches_read_own on webinar_touches
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy webinar_touches_read_org on webinar_touches
  for select to authenticated
  using (
    ((select app.is_org_admin()) or (select app.is_superadmin()))
    and exists (
      select 1 from users u
      where u.id = webinar_touches.user_id
        and u.organization_id = (select app.org_id())
    )
  );

create policy webinar_touches_read_superadmin on webinar_touches
  for select to authenticated
  using ((select app.is_superadmin()));

-- ------------------------------------------------------------
-- The learner's schedule.
-- ------------------------------------------------------------
create or replace function public.webinar_feed()
returns table (
  webinar_id       uuid,
  title            text,
  description      text,
  starts_at        timestamptz,
  duration_min     int,
  join_url         text,
  recording_url    text,
  is_upcoming      boolean,
  joined_live      boolean,
  opened_recording boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    w.id, w.title, w.description, w.starts_at, w.duration_min,
    -- The join link is handed out only while it leads somewhere. A Zoom
    -- room for a broadcast that ended is a dead end; the recording is
    -- what replaces it.
    case when now() < w.starts_at + make_interval(mins => w.duration_min)
         then w.join_url end,
    w.recording_url,
    now() < w.starts_at + make_interval(mins => w.duration_min),
    exists (
      select 1 from webinar_touches t
      where t.webinar_id = w.id
        and t.user_id = (select auth.uid())
        and t.source = 'live'
    ),
    exists (
      select 1 from webinar_touches t
      where t.webinar_id = w.id
        and t.user_id = (select auth.uid())
        and t.source = 'recording'
    )
  from webinars w
  -- security definer bypasses the policy above, so the same condition is
  -- spelled out here. Dropping this line would publish the schedule to
  -- expired organizations.
  where w.is_published
    and (select app.has_course_access())
  order by w.starts_at desc;
$$;

revoke all on function public.webinar_feed() from public, anon;
grant execute on function public.webinar_feed() to authenticated;

-- The dashboard needs one row, not the archive.
create or replace function public.next_webinar()
returns table (
  webinar_id       uuid,
  title            text,
  description      text,
  starts_at        timestamptz,
  duration_min     int,
  join_url         text,
  recording_url    text,
  is_upcoming      boolean,
  joined_live      boolean,
  opened_recording boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select * from public.webinar_feed() f
  where f.is_upcoming
  order by f.starts_at
  limit 1;
$$;

revoke all on function public.next_webinar() from public, anon;
grant execute on function public.next_webinar() to authenticated;

-- ------------------------------------------------------------
-- Recording a touch.
-- ------------------------------------------------------------
create or replace function public.record_webinar_touch(
  p_webinar uuid,
  p_source  webinar_touch
)
returns table (out_ok boolean, out_reason text)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ok  boolean;
begin
  if v_uid is null then
    return query select false, 'not_authenticated'; return;
  end if;

  if not (select app.has_course_access()) then
    return query select false, 'no_access'; return;
  end if;

  -- A touch only exists where there was something to open: no link, no
  -- record. Otherwise the column counts intentions.
  select true into v_ok
  from webinars w
  where w.id = p_webinar
    and w.is_published
    and case p_source
          when 'live'      then w.join_url is not null
                                and now() < w.starts_at + make_interval(mins => w.duration_min)
          when 'recording' then w.recording_url is not null
        end;

  if v_ok is null then
    return query select false, 'webinar_not_open'; return;
  end if;

  insert into webinar_touches (webinar_id, user_id, source)
  values (p_webinar, v_uid, p_source)
  on conflict (webinar_id, user_id, source) do nothing;

  -- Counts as activity in the owner's report. A deliberate tap on a
  -- broadcast is not a page load, and a manager who reads «не заходив
  -- тиждень» next to someone who was on last night's webinar stops
  -- trusting the column entirely.
  update users u set last_seen_at = now() where u.id = v_uid;

  return query select true, 'recorded';
end;
$$;

revoke all on function public.record_webinar_touch(uuid, webinar_touch) from public, anon;
grant execute on function public.record_webinar_touch(uuid, webinar_touch) to authenticated;
