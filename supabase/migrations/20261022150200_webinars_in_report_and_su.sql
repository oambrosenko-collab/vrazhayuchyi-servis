-- ============================================================
-- Step 5c: webinars in the owner's report, and the owner's own editor.
-- ============================================================

-- The return type gains two columns, and Postgres will not replace a
-- function whose signature changes. Dropping is safe: nothing but the
-- app calls it, and the grant is re-issued below.
drop function if exists public.team_report();

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
  -- Webinars this person opened, against the webinars that happened
  -- while they held a seat. Both are counted over the last three months:
  -- a full year of history tells the manager nothing about today, and
  -- someone hired last week must not look negligent for the ten
  -- broadcasts that ran before they existed.
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
    and ((select app.is_org_admin()) or (select app.is_superadmin()))
  order by (u.status = 'removed'), u.joined_at;
$$;

revoke all on function public.team_report() from public, anon;
grant execute on function public.team_report() to authenticated;

-- ------------------------------------------------------------
-- The owner's editor. Reads unpublished rows too, which the learner
-- feed never returns.
-- ------------------------------------------------------------
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
  where (select app.is_superadmin())
  order by w.starts_at desc;
$$;

revoke all on function public.su_webinars() from public, anon;
grant execute on function public.su_webinars() to authenticated;

create or replace function public.su_save_webinar(
  p_id            uuid,
  p_title         text,
  p_description   text,
  p_starts_at     timestamptz,
  p_duration_min  int,
  p_join_url      text,
  p_recording_url text,
  p_published     boolean
)
returns table (out_ok boolean, out_id uuid)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_id   uuid;
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_join text := nullif(btrim(coalesce(p_join_url, '')), '');
  v_rec  text := nullif(btrim(coalesce(p_recording_url, '')), '');
begin
  perform app.require_superadmin();

  if p_starts_at is null then
    raise exception 'starts_at is required';
  end if;

  if p_id is null then
    insert into webinars (title, description, starts_at, duration_min,
                          join_url, recording_url, is_published)
    values (btrim(p_title), v_desc, p_starts_at,
            coalesce(p_duration_min, 60), v_join, v_rec,
            coalesce(p_published, false))
    returning id into v_id;
  else
    update webinars w
       set title         = btrim(p_title),
           description   = v_desc,
           starts_at     = p_starts_at,
           duration_min  = coalesce(p_duration_min, w.duration_min),
           join_url      = v_join,
           recording_url = v_rec,
           is_published  = coalesce(p_published, w.is_published)
     where w.id = p_id
    returning w.id into v_id;
  end if;

  return query select v_id is not null, v_id;
end;
$$;

revoke all on function public.su_save_webinar(uuid, text, text, timestamptz, int, text, text, boolean) from public, anon;
grant execute on function public.su_save_webinar(uuid, text, text, timestamptz, int, text, text, boolean) to authenticated;

create or replace function public.su_delete_webinar(p_id uuid)
returns table (out_ok boolean)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  perform app.require_superadmin();
  -- Touches cascade. A webinar nobody opened is a scheduling mistake and
  -- should be removable; one with an audience is history, so the editor
  -- unpublishes instead — see the guard in the UI.
  delete from webinars w where w.id = p_id;
  get diagnostics n = row_count;
  return query select n = 1;
end;
$$;

revoke all on function public.su_delete_webinar(uuid) from public, anon;
grant execute on function public.su_delete_webinar(uuid) to authenticated;
