-- Two screens showed 37% and 38% for the same five people: one floored
-- each learner's percentage before averaging, the other averaged the raw
-- fractions. A learner sees their own number floored, so floor first
-- everywhere and round only the average. Also stop counting the owner as
-- an occupied seat in the platform overview.

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
  if not (select app.is_superadmin()) then
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
    (select count(*)::int from learner),
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
  id uuid, name text, admin_email text, package_size int,
  seats_taken int, activation int, avg_percent int, cumulative_users int,
  status org_status, expires_at timestamptz, days_left int,
  created_at timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare v_lessons int;
begin
  if not (select app.is_superadmin()) then
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
    -- Floor each learner the same way their own screen does, then round
    -- the average. Averaging raw fractions drifts by a point and makes
    -- two screens disagree about the same people.
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
