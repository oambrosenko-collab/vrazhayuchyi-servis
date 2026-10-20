-- ============================================================
-- Step 5a: the platform owner's view.
--
-- Everything here is gated on app.is_superadmin() inside the function,
-- not only by a grant. A definer function that forgets its own guard is
-- a hole with a nice name, so each one checks before it reads.
--
-- su_overview and su_organizations are superseded later in this batch
-- (superadmin_is_not_a_learner, consistent_percent_rounding); kept so
-- the migration history matches what was applied.
-- ============================================================

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
    where u.status = 'active' and u.role <> 'superadmin'
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

-- ------------------------------------------------------------
-- Every restaurant, with the one number that predicts renewal.
-- ------------------------------------------------------------
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
  ) t
  cross join lateral (
    select count(*)::int as total from users u where u.organization_id = o.id
  ) c
  cross join lateral (
    select round(avg(
      case when v_lessons = 0 then 0
           else 100.0 * (
             select count(*) from lesson_progress lp
             where lp.user_id = u.id and lp.completed_at is not null
           ) / v_lessons
      end
    ))::int as avg_pct
    from users u
    where u.organization_id = o.id and u.status = 'active'
  ) p
  order by o.created_at desc;
end;
$$;

-- ------------------------------------------------------------
-- The course as the author sees it, published or not.
-- ------------------------------------------------------------
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
  if not (select app.is_superadmin()) then
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

-- ------------------------------------------------------------
-- The question bank, answer key included. This is the only function
-- in the schema that returns is_correct, and it is superadmin-only.
-- ------------------------------------------------------------
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
  if not (select app.is_superadmin()) then
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

revoke all on function public.su_overview()      from public, anon;
revoke all on function public.su_organizations() from public, anon;
revoke all on function public.su_course_tree()   from public, anon;
revoke all on function public.su_quiz_tree()     from public, anon;
grant execute on function public.su_overview()      to authenticated;
grant execute on function public.su_organizations() to authenticated;
grant execute on function public.su_course_tree()   to authenticated;
grant execute on function public.su_quiz_tree()     to authenticated;
