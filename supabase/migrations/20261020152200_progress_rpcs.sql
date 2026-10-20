-- ============================================================
-- Progress is written only here. The 90% rule is server-side on purpose:
-- a client that can declare itself finished makes the owner's report
-- worthless, and the report is what the restaurant is buying.
-- ============================================================

-- How much of a lesson must be watched before it counts.
create or replace function app.completion_ratio()
returns numeric language sql immutable as $$ select 0.90::numeric $$;

create or replace function public.save_lesson_progress(
  p_lesson_id    uuid,
  p_position_sec int,
  -- Seconds of real playback since the previous beat. The client sends
  -- roughly the beat interval; anything larger is a scrub, a tab wake, or
  -- a forged call, so it gets clamped rather than trusted.
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

  -- Reading through RLS here is deliberate even in a definer function:
  -- it proves the lesson is published and reachable by this person.
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

  -- A beat is every 5 seconds; 15 leaves room for a slow network or a
  -- backgrounded tab without letting anyone fast-forward their way to a
  -- certificate.
  v_delta    := least(greatest(coalesce(p_delta_sec, 0), 0), 15);
  v_position := least(greatest(coalesce(p_position_sec, 0), 0), v_duration);

  insert into lesson_progress (user_id, lesson_id, position_sec, watched_sec)
  values (v_uid, p_lesson_id, v_position, least(v_delta, v_duration))
  on conflict (user_id, lesson_id) do update
    set position_sec = v_position,
        watched_sec  = least(lesson_progress.watched_sec + v_delta, v_duration)
  returning watched_sec into v_watched;

  v_done := v_watched >= ceil(v_duration * app.completion_ratio());

  -- Stamped once. Re-watching a finished lesson must not move the date
  -- the report shows.
  if v_done then
    update lesson_progress lp
       set completed_at = coalesce(lp.completed_at, now())
     where lp.user_id = v_uid and lp.lesson_id = p_lesson_id;
  end if;

  return query select true, 'saved', v_watched, v_done;
end;
$$;

-- ------------------------------------------------------------
-- The whole course plus this person's progress, in one round trip.
-- /learn renders straight from this.
-- ------------------------------------------------------------
create or replace function public.course_outline(p_slug text default null)
returns table (
  course_id     uuid,
  course_title  text,
  course_slug   text,
  module_id     uuid,
  module_title  text,
  module_order  int,
  lesson_id     uuid,
  lesson_title  text,
  lesson_order  int,
  duration_sec  int,
  has_video     boolean,
  watched_sec   int,
  completed     boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    c.id, c.title, c.slug,
    m.id, m.title, m.order_index,
    l.id, l.title, l.order_index,
    l.duration_sec,
    l.bunny_video_id is not null,
    coalesce(lp.watched_sec, 0),
    lp.completed_at is not null
  from courses c
  join modules m on m.course_id = c.id
  join lessons l on l.module_id = m.id
  left join lesson_progress lp
    on lp.lesson_id = l.id and lp.user_id = (select auth.uid())
  where c.is_published
    and (p_slug is null or c.slug = p_slug)
    and (select app.has_course_access())
  order by m.order_index, l.order_index;
$$;

revoke all on function public.save_lesson_progress(uuid, int, int) from public, anon;
revoke all on function public.course_outline(text)                  from public, anon;
grant execute on function public.save_lesson_progress(uuid, int, int) to authenticated;
grant execute on function public.course_outline(text)                 to authenticated;
