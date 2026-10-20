-- ============================================================
-- Certificates. Issued once, by the server, only when the course is
-- genuinely finished — every lesson watched and every quiz passed.
-- ============================================================

create or replace function public.certificate_status()
returns table (
  lessons_done   int,
  lessons_total  int,
  quizzes_passed int,
  quizzes_total  int,
  eligible       boolean,
  number         text,
  issued_at      timestamptz,
  full_name      text,
  org_name       text,
  course_title   text
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with pub as (
    select c.id, c.title from courses c where c.is_published limit 1
  )
  select
    l.done, l.total, q.passed, q.total,
    -- An empty course must never hand out a certificate.
    (l.total > 0 and l.done = l.total and q.passed = q.total),
    cert.number, cert.issued_at,
    u.full_name, o.name, pub.title
  from pub
  cross join lateral (
    select count(*)::int as total,
           count(*) filter (
             where exists (
               select 1 from lesson_progress lp
               where lp.lesson_id = les.id
                 and lp.user_id = (select auth.uid())
                 and lp.completed_at is not null
             )
           )::int as done
    from lessons les
    join modules m on m.id = les.module_id
    where m.course_id = pub.id
  ) l
  cross join lateral (
    select count(*)::int as total,
           count(*) filter (
             where exists (
               select 1 from quiz_attempts at
               where at.quiz_id = qz.id
                 and at.user_id = (select auth.uid())
                 and at.passed
             )
           )::int as passed
    from quizzes qz
    where qz.course_id = pub.id
  ) q
  left join users u on u.id = (select auth.uid())
  left join organizations o on o.id = u.organization_id
  left join certificates cert
    on cert.user_id = (select auth.uid()) and cert.course_id = pub.id;
$$;

create or replace function public.issue_certificate()
returns table (
  out_ok     boolean,
  out_reason text,
  out_number text
)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_course uuid;
  st       record;
  v_user   users;
  v_org    organizations;
  v_number text;
begin
  if v_uid is null then
    return query select false, 'not_authenticated', null::text; return;
  end if;

  select c.id into v_course from courses c where c.is_published limit 1;

  if v_course is null then
    return query select false, 'no_course', null::text; return;
  end if;

  -- Idempotent: a second click returns the same document, it does not
  -- mint a second number.
  select cert.number into v_number
  from certificates cert
  where cert.user_id = v_uid and cert.course_id = v_course;

  if v_number is not null then
    return query select true, 'already_issued', v_number; return;
  end if;

  select * into st from public.certificate_status();
  if st is null or not st.eligible then
    return query select false, 'not_eligible', null::text; return;
  end if;

  select * into v_user from users u where u.id = v_uid;
  select * into v_org  from organizations o where o.id = v_user.organization_id;

  -- Human-readable and sortable. The public verification page is v1.1,
  -- but the number belongs to the document from day one so it does not
  -- have to be retrofitted onto certificates already handed out.
  v_number := 'VS-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('certificate_number_seq')::text, 5, '0');

  insert into certificates (user_id, course_id, number, full_name, org_name)
  values (v_uid, v_course, v_number, v_user.full_name, coalesce(v_org.name, '—'));

  return query select true, 'issued', v_number;
end;
$$;

revoke all on function public.certificate_status() from public, anon;
revoke all on function public.issue_certificate()  from public, anon;
grant execute on function public.certificate_status() to authenticated;
grant execute on function public.issue_certificate()  to authenticated;
