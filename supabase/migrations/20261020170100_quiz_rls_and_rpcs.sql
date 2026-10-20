-- ============================================================
-- The answer key never leaves the database.
--
-- quiz_questions and quiz_options get no grant at all — not a policy
-- that hides a column, because RLS is row-level and `is_correct` would
-- travel with the row. The only way to see a question is through
-- quiz_sheet(), which does not select that column, and the only way to
-- be graded is submit_quiz_attempt(), which grades server-side.
-- ============================================================

alter table quizzes        enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_options   enable row level security;
alter table quiz_attempts  enable row level security;
alter table certificates   enable row level security;

alter table quizzes        force row level security;
alter table quiz_questions force row level security;
alter table quiz_options   force row level security;
alter table quiz_attempts  force row level security;
alter table certificates   force row level security;

revoke all on quizzes, quiz_questions, quiz_options, quiz_attempts, certificates
  from anon, authenticated;

-- Metadata only: title, pass mark, which module. Harmless, and the
-- outline needs it.
grant select on quizzes       to authenticated;
grant select on quiz_attempts to authenticated;
grant select on certificates  to authenticated;

create policy quizzes_read on quizzes
  for select to authenticated
  using (
    exists (
      select 1 from courses c
      where c.id = quizzes.course_id
        and c.is_published
        and (select app.has_course_access())
    )
    or (select app.is_superadmin())
  );

-- Own attempts always; the restaurant's admin sees the team's, because
-- the score belongs in the report they are paying for.
create policy quiz_attempts_read_own on quiz_attempts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy quiz_attempts_read_org on quiz_attempts
  for select to authenticated
  using (
    ((select app.is_org_admin()) or (select app.is_superadmin()))
    and exists (
      select 1 from users u
      where u.id = quiz_attempts.user_id
        and u.organization_id = (select app.org_id())
    )
  );

-- A certificate survives expiry and even a freed seat: it is a statement
-- about something that already happened.
create policy certificates_read_own on certificates
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy certificates_read_org on certificates
  for select to authenticated
  using (
    ((select app.is_org_admin()) or (select app.is_superadmin()))
    and exists (
      select 1 from users u
      where u.id = certificates.user_id
        and u.organization_id = (select app.org_id())
    )
  );

-- ------------------------------------------------------------
-- What quizzes exist, and how this person has done on them.
-- ------------------------------------------------------------
create or replace function public.course_quizzes()
returns table (
  quiz_id        uuid,
  module_id      uuid,
  title          text,
  pass_score     int,
  is_final       boolean,
  question_count int,
  best_score     int,
  passed         boolean,
  attempts       int
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    q.id, q.module_id, q.title, q.pass_score, q.is_final,
    (select count(*)::int from quiz_questions qq where qq.quiz_id = q.id),
    coalesce(a.best, 0),
    coalesce(a.passed, false),
    coalesce(a.n, 0)
  from quizzes q
  join courses c on c.id = q.course_id
  left join lateral (
    select max(at.score)::int as best,
           bool_or(at.passed)  as passed,
           count(*)::int       as n
    from quiz_attempts at
    where at.quiz_id = q.id and at.user_id = (select auth.uid())
  ) a on true
  where c.is_published
    and (select app.has_course_access())
  order by q.is_final, q.title;
$$;

-- ------------------------------------------------------------
-- The question sheet. Note what is absent: is_correct.
-- ------------------------------------------------------------
create or replace function public.quiz_sheet(p_quiz_id uuid)
returns table (
  quiz_title     text,
  pass_score     int,
  question_id    uuid,
  prompt         text,
  question_order int,
  option_id      uuid,
  label          text,
  option_order   int
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    q.title, q.pass_score,
    qq.id, qq.prompt,
    -- Shuffled per request, as the PRD asks. Answers are submitted keyed
    -- by question id, so the order carries no meaning to the server.
    (dense_rank() over (order by md5(qq.id::text || now()::text)))::int,
    qo.id, qo.label, qo.order_index
  from quizzes q
  join courses c         on c.id = q.course_id
  join quiz_questions qq on qq.quiz_id = q.id
  join quiz_options qo   on qo.question_id = qq.id
  where q.id = p_quiz_id
    and c.is_published
    and (select app.has_course_access())
  order by 3, qo.order_index;
$$;

-- ------------------------------------------------------------
-- Grading. The only place a correct answer is ever compared.
-- ------------------------------------------------------------
create or replace function public.submit_quiz_attempt(
  p_quiz_id uuid,
  -- { "<question_id>": "<option_id>", ... }
  p_answers jsonb
)
returns table (
  out_ok      boolean,
  out_reason  text,
  out_score   int,
  out_passed  boolean,
  out_correct int,
  out_total   int,
  -- What to go back and rewatch. A bare number teaches nothing.
  out_weak_topics text[]
)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_pass  int;
  v_total int;
  v_right int;
  v_score int;
  v_ok    boolean;
  v_weak  text[];
begin
  if v_uid is null then
    return query select false, 'not_authenticated', 0, false, 0, 0, null::text[]; return;
  end if;

  if not (select app.has_course_access()) then
    return query select false, 'no_access', 0, false, 0, 0, null::text[]; return;
  end if;

  select q.pass_score into v_pass
  from quizzes q join courses c on c.id = q.course_id
  where q.id = p_quiz_id and c.is_published;

  if v_pass is null then
    return query select false, 'quiz_not_found', 0, false, 0, 0, null::text[]; return;
  end if;

  select count(*)::int into v_total from quiz_questions qq where qq.quiz_id = p_quiz_id;
  if v_total = 0 then
    return query select false, 'quiz_empty', 0, false, 0, 0, null::text[]; return;
  end if;

  -- A missing or unknown answer simply scores zero for that question;
  -- there is no partial credit and no error to report.
  select
    count(*) filter (where chosen.is_correct),
    array_agg(distinct qq.topic) filter (where not coalesce(chosen.is_correct, false))
  into v_right, v_weak
  from quiz_questions qq
  left join quiz_options chosen
    on chosen.question_id = qq.id
   and chosen.id = nullif(p_answers ->> qq.id::text, '')::uuid
  where qq.quiz_id = p_quiz_id;

  v_score := floor(100.0 * coalesce(v_right, 0) / v_total)::int;
  v_ok    := v_score >= v_pass;

  insert into quiz_attempts (user_id, quiz_id, score, passed, answers)
  values (v_uid, p_quiz_id, v_score, v_ok, coalesce(p_answers, '{}'::jsonb));

  update users u set last_seen_at = now() where u.id = v_uid;

  return query select true, 'graded', v_score, v_ok,
                      coalesce(v_right, 0), v_total,
                      case when v_ok then null::text[] else v_weak end;
end;
$$;

revoke all on function public.course_quizzes()                 from public, anon;
revoke all on function public.quiz_sheet(uuid)                 from public, anon;
revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.course_quizzes()                 to authenticated;
grant execute on function public.quiz_sheet(uuid)                 to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
