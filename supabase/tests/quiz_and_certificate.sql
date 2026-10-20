-- ============================================================
-- Quizzes and certificates. Fourth companion test; every row must
-- read PASS before a release.
--
-- The one that matters most is the first pair: the answer key must be
-- unreachable from a signed-in session. Everything else is arithmetic.
--
--   supabase db execute --file supabase/tests/quiz_and_certificate.sql
-- Seeds inside a transaction and rolls back.
-- ============================================================

begin;

create temp table r(check_name text, expected text, got text, ok boolean)
  on commit drop;
grant insert, select on r to authenticated, anon;

do $$
declare
  org organizations;
  u    uuid := gen_random_uuid();
  qid  uuid;
  n int; res record; st record;
  ans_wrong jsonb; ans_three jsonb; ans_all jsonb;
  cert1 text; cert2 text;
begin
  org := app.provision_organization('Quiz Co', 5, 'q@t.invalid', 12);

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values (u, '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', 'q@t.invalid', '', now(), now(), now());

  insert into users (id, organization_id, email, full_name, role, status)
  values (u, org.id, 'q@t.invalid', 'Тест Квізу', 'employee', 'active');

  select q.id into qid from quizzes q where not q.is_final order by q.title limit 1;

  -- Build the answer maps while still privileged. The graded calls below
  -- run as the employee, who cannot see the key — which is the point.
  select jsonb_object_agg(qq.id::text, w.id) into ans_wrong
  from quiz_questions qq
  join lateral (select o.id from quiz_options o
                 where o.question_id = qq.id and not o.is_correct limit 1) w on true
  where qq.quiz_id = qid;

  select jsonb_object_agg(qq.id::text, g.id) into ans_all
  from quiz_questions qq
  join lateral (select o.id from quiz_options o
                 where o.question_id = qq.id and o.is_correct) g on true
  where qq.quiz_id = qid;

  select jsonb_object_agg(x.q::text, x.o) into ans_three from (
    select qq.id as q,
           case when row_number() over (order by qq.order_index) <= 3
                then (select o.id from quiz_options o
                       where o.question_id = qq.id and o.is_correct)
                else (select o.id from quiz_options o
                       where o.question_id = qq.id and not o.is_correct limit 1)
           end as o
    from quiz_questions qq where qq.quiz_id = qid
  ) x;

  perform set_config('request.jwt.claims',
    json_build_object('sub', u::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- ---------- the answer key is unreachable ----------
  begin
    select count(*) into n from quiz_options;
    insert into r values ('direct read of quiz_options', 'no grant', 'returned ' || n, false);
  exception when insufficient_privilege then
    insert into r values ('direct read of quiz_options', 'no grant', 'permission denied', true);
  end;
  begin
    select count(*) into n from quiz_questions;
    insert into r values ('direct read of quiz_questions', 'no grant', 'returned ' || n, false);
  exception when insufficient_privilege then
    insert into r values ('direct read of quiz_questions', 'no grant', 'permission denied', true);
  end;

  select count(*) into n from public.quiz_sheet(qid);
  insert into r values ('quiz_sheet returns 4 questions x 3 options', '12', n::text, n = 12);

  -- ---------- grading ----------
  select * into res from public.submit_quiz_attempt(qid, ans_wrong);
  insert into r values ('all wrong scores 0', '0', res.out_score::text, res.out_score = 0);
  insert into r values ('all wrong fails', 'false', res.out_passed::text, res.out_passed = false);
  insert into r values ('weak topics listed', '4',
                        coalesce(array_length(res.out_weak_topics, 1), 0)::text,
                        coalesce(array_length(res.out_weak_topics, 1), 0) = 4);

  select * into res from public.submit_quiz_attempt(qid, ans_three);
  insert into r values ('3 of 4 scores 75', '75', res.out_score::text, res.out_score = 75);
  insert into r values ('75 does not reach the 80 pass mark', 'false',
                        res.out_passed::text, res.out_passed = false);
  insert into r values ('exactly one weak topic named', '1',
                        coalesce(array_length(res.out_weak_topics, 1), 0)::text,
                        coalesce(array_length(res.out_weak_topics, 1), 0) = 1);

  select * into res from public.submit_quiz_attempt(qid, ans_all);
  insert into r values ('all right scores 100', '100', res.out_score::text, res.out_score = 100);
  insert into r values ('all right passes', 'true', res.out_passed::text, res.out_passed = true);
  insert into r values ('no weak topics when passed', 'null',
                        coalesce(array_length(res.out_weak_topics, 1), 0)::text,
                        res.out_weak_topics is null);

  -- a forged payload earns nothing
  select * into res from public.submit_quiz_attempt(qid, '{"not-a-uuid":"nonsense"}'::jsonb);
  insert into r values ('garbage answers score 0', '0', res.out_score::text, res.out_score = 0);

  select count(*) into n from quiz_attempts;
  insert into r values ('every attempt kept', '4', n::text, n = 4);

  -- ---------- the certificate is earned, not requested ----------
  select * into res from public.issue_certificate();
  insert into r values ('certificate refused before the course is done',
                        'not_eligible', res.out_reason, res.out_reason = 'not_eligible');
  reset role;

  insert into lesson_progress (user_id, lesson_id, position_sec, watched_sec, completed_at)
  select u, l.id, l.duration_sec, l.duration_sec, now() from lessons l;
  insert into quiz_attempts (user_id, quiz_id, score, passed)
  select u, q.id, 100, true from quizzes q;

  perform set_config('request.jwt.claims',
    json_build_object('sub', u::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select * into st from public.certificate_status();
  insert into r values ('status counts lessons', '8/8',
                        st.lessons_done || '/' || st.lessons_total,
                        st.lessons_done = 8 and st.lessons_total = 8);
  insert into r values ('status counts quizzes', '4/4',
                        st.quizzes_passed || '/' || st.quizzes_total,
                        st.quizzes_passed = 4 and st.quizzes_total = 4);
  insert into r values ('status is eligible', 'true', st.eligible::text, st.eligible);

  select * into res from public.issue_certificate();
  cert1 := res.out_number;
  insert into r values ('certificate issued', 'issued', res.out_reason,
                        res.out_reason = 'issued');
  insert into r values ('number matches VS-YYYY-NNNNN', 'true', coalesce(cert1, ''),
                        cert1 ~ '^VS-\d{4}-\d{5}$');

  select * into res from public.issue_certificate();
  cert2 := res.out_number;
  insert into r values ('second call is idempotent', 'already_issued', res.out_reason,
                        res.out_reason = 'already_issued');
  insert into r values ('same number returned', 'true', coalesce(cert2, ''), cert1 = cert2);

  select count(*) into n from certificates;
  insert into r values ('exactly one certificate row', '1', n::text, n = 1);
  reset role;
end $$;

select
  check_name,
  case when ok then 'PASS' else 'FAIL — got: ' || got end as result
from r
order by ok, check_name;

rollback;
