-- ============================================================
-- Step 4: quizzes and certificates.
--
-- The PRD's diagram hangs every quiz off a module. A final quiz covers
-- the whole course and belongs to no single module, so quizzes carry a
-- course_id always and a module_id only when they are a module test.
-- ============================================================

create table quizzes (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses(id) on delete cascade,
  -- Null for the final test, which spans the course.
  module_id  uuid references modules(id) on delete cascade,
  title      text not null check (length(btrim(title)) between 2 and 160),
  pass_score int  not null default 80 check (pass_score between 1 and 100),
  is_final   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quizzes_final_has_no_module
    check ((is_final and module_id is null) or (not is_final and module_id is not null))
);

create unique index quizzes_one_per_module on quizzes (module_id)
  where module_id is not null;
create unique index quizzes_one_final_per_course on quizzes (course_id)
  where is_final;

create table quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references quizzes(id) on delete cascade,
  prompt      text not null check (length(btrim(prompt)) between 4 and 500),
  -- Named so a failed attempt can say what to go back and rewatch,
  -- rather than only showing a number. The PRD is explicit about that.
  topic       text not null check (length(btrim(topic)) between 2 and 120),
  explanation text,
  order_index int not null check (order_index >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (quiz_id, order_index) deferrable initially deferred
);

create table quiz_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  label       text not null check (length(btrim(label)) between 1 and 300),
  is_correct  boolean not null default false,
  order_index int not null check (order_index >= 0),
  created_at  timestamptz not null default now(),
  unique (question_id, order_index) deferrable initially deferred
);

-- Exactly one correct option per question. A trigger rather than a
-- constraint because it spans rows of the same table.
create or replace function app.assert_one_correct_option()
returns trigger language plpgsql
set search_path = public, pg_temp
as $$
declare
  q uuid := coalesce(new.question_id, old.question_id);
  n int;
begin
  select count(*) into n from quiz_options o
   where o.question_id = q and o.is_correct;
  if n > 1 then
    raise exception 'question % has % correct options, expected one', q, n;
  end if;
  return null;
end;
$$;

create constraint trigger quiz_options_one_correct
  after insert or update on quiz_options
  deferrable initially deferred
  for each row execute function app.assert_one_correct_option();

-- Attempts are unlimited by design, so this table only grows. Every try
-- is kept: the owner's report should be able to show effort, not just
-- the final number.
create table quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  quiz_id    uuid not null references quizzes(id) on delete cascade,
  score      int  not null check (score between 0 and 100),
  passed     boolean not null,
  -- { question_id: option_id } as submitted, so a result can be replayed.
  answers    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index quiz_attempts_by_user   on quiz_attempts (user_id, quiz_id, created_at desc);
create index quiz_questions_by_quiz  on quiz_questions (quiz_id, order_index);
create index quiz_options_by_question on quiz_options (question_id, order_index);

-- ------------------------------------------------------------
-- Certificates. One per person per course, issued once.
-- ------------------------------------------------------------
create sequence certificate_number_seq;

create table certificates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  course_id  uuid not null references courses(id) on delete cascade,
  number     text not null unique,
  -- Copied, not joined. A certificate states who was trained and where,
  -- as of the day it was issued; renaming the restaurant later must not
  -- rewrite a document someone already downloaded.
  full_name  text not null,
  org_name   text not null,
  issued_at  timestamptz not null default now(),
  unique (user_id, course_id)
);

create index certificates_by_user on certificates (user_id);

create trigger quizzes_touch        before update on quizzes
  for each row execute function touch_updated_at();
create trigger quiz_questions_touch before update on quiz_questions
  for each row execute function touch_updated_at();
