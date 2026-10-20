-- ============================================================
-- Step 5b: the owner's write surface.
--
-- Still RPCs, not write policies — the rule from step 1 holds even for
-- the superadmin. Coarse-grained on purpose: one call saves a whole
-- lesson or a whole question with its options, so a half-written
-- question can never reach the database.
-- ============================================================

create or replace function app.require_superadmin()
returns void language plpgsql stable
set search_path = public, pg_temp
as $$
begin
  if not (select app.is_superadmin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- ---------------- organizations ----------------

create or replace function public.su_extend_access(p_org uuid, p_months int)
returns table (out_ok boolean, out_expires_at timestamptz)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare v_new timestamptz;
begin
  perform app.require_superadmin();
  if p_months is null or p_months not between 1 and 60 then
    raise exception 'months must be between 1 and 60';
  end if;

  -- Extend from today when access has already lapsed, otherwise from the
  -- existing end date — renewing early must not cost the customer days.
  update organizations o
     set expires_at = greatest(coalesce(o.expires_at, now()), now())
                      + make_interval(months => p_months),
         status = case when o.status = 'expired' then 'active' else o.status end
   where o.id = p_org
  returning o.expires_at into v_new;

  return query select v_new is not null, v_new;
end;
$$;

create or replace function public.su_add_seats(p_org uuid, p_delta int)
returns table (out_ok boolean, out_package_size int)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare v_size int; v_taken int;
begin
  perform app.require_superadmin();

  select count(*)::int into v_taken
  from users u where u.organization_id = p_org and u.status = 'active';

  update organizations o
     set package_size = o.package_size + p_delta
   where o.id = p_org
     -- Never shrink below the seats already in use: that would silently
     -- put the restaurant over its own limit.
     and o.package_size + p_delta >= greatest(v_taken, 1)
     and o.package_size + p_delta <= 1000
  returning o.package_size into v_size;

  return query select v_size is not null, coalesce(v_size, 0);
end;
$$;

create or replace function public.su_set_org_status(p_org uuid, p_status org_status)
returns table (out_ok boolean)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  perform app.require_superadmin();
  update organizations o set status = p_status where o.id = p_org;
  get diagnostics n = row_count;
  return query select n = 1;
end;
$$;

-- ---------------- course content ----------------

create or replace function public.su_set_course_published(p_course uuid, p_published boolean)
returns table (out_ok boolean)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  perform app.require_superadmin();
  update courses c set is_published = p_published where c.id = p_course;
  get diagnostics n = row_count;
  return query select n = 1;
end;
$$;

create or replace function public.su_save_module(
  p_id uuid, p_course uuid, p_title text, p_summary text
)
returns table (out_ok boolean, out_id uuid)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_next int;
begin
  perform app.require_superadmin();

  if p_id is null then
    select coalesce(max(m.order_index) + 1, 0) into v_next
    from modules m where m.course_id = p_course;

    insert into modules (course_id, title, summary, order_index)
    values (p_course, btrim(p_title), nullif(btrim(coalesce(p_summary,'')), ''), v_next)
    returning id into v_id;
  else
    update modules m
       set title = btrim(p_title),
           summary = nullif(btrim(coalesce(p_summary,'')), '')
     where m.id = p_id
    returning m.id into v_id;
  end if;

  return query select v_id is not null, v_id;
end;
$$;

create or replace function public.su_save_lesson(
  p_id uuid, p_module uuid, p_title text, p_description text,
  p_duration_sec int, p_bunny_video_id text
)
returns table (out_ok boolean, out_id uuid)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_next int;
begin
  perform app.require_superadmin();

  if p_duration_sec is null or p_duration_sec not between 1 and 36000 then
    raise exception 'duration must be between 1 and 36000 seconds';
  end if;

  if p_id is null then
    select coalesce(max(l.order_index) + 1, 0) into v_next
    from lessons l where l.module_id = p_module;

    insert into lessons (module_id, title, description, duration_sec,
                         bunny_video_id, order_index)
    values (p_module, btrim(p_title),
            nullif(btrim(coalesce(p_description,'')), ''),
            p_duration_sec,
            nullif(btrim(coalesce(p_bunny_video_id,'')), ''),
            v_next)
    returning id into v_id;
  else
    update lessons l
       set title = btrim(p_title),
           description = nullif(btrim(coalesce(p_description,'')), ''),
           duration_sec = p_duration_sec,
           bunny_video_id = nullif(btrim(coalesce(p_bunny_video_id,'')), '')
     where l.id = p_id
    returning l.id into v_id;
  end if;

  return query select v_id is not null, v_id;
end;
$$;

-- Moving a lesson up or down. order_index is a deferred unique
-- constraint, so the two updates can swap inside one statement pair.
create or replace function public.su_move_lesson(p_id uuid, p_direction int)
returns table (out_ok boolean)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare v_mod uuid; v_pos int; v_other uuid; v_other_pos int;
begin
  perform app.require_superadmin();

  select l.module_id, l.order_index into v_mod, v_pos
  from lessons l where l.id = p_id;
  if v_mod is null then return query select false; return; end if;

  select l.id, l.order_index into v_other, v_other_pos
  from lessons l
  where l.module_id = v_mod
    and (case when p_direction < 0 then l.order_index < v_pos
              else l.order_index > v_pos end)
  order by case when p_direction < 0 then -l.order_index else l.order_index end
  limit 1;

  if v_other is null then return query select false; return; end if;

  update lessons set order_index = v_other_pos where id = p_id;
  update lessons set order_index = v_pos       where id = v_other;
  return query select true;
end;
$$;

create or replace function public.su_delete_lesson(p_id uuid)
returns table (out_ok boolean, out_reason text)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  perform app.require_superadmin();

  -- Progress rows cascade, so deleting a watched lesson erases evidence
  -- the owner's report already showed. Refuse and let it be hidden by
  -- unpublishing the course instead.
  select count(*)::int into n from lesson_progress lp where lp.lesson_id = p_id;
  if n > 0 then
    return query select false, 'has_progress'; return;
  end if;

  delete from lessons l where l.id = p_id;
  get diagnostics n = row_count;
  return query select n = 1, case when n = 1 then 'deleted' else 'not_found' end;
end;
$$;

-- ---------------- questions ----------------

-- Saves a question and its options together. p_options is
-- [{"label": "...", "is_correct": true}, ...] — the whole set replaces
-- whatever was there, so a question can never end up with two correct
-- answers or none.
create or replace function public.su_save_question(
  p_id uuid, p_quiz uuid, p_prompt text, p_topic text, p_options jsonb
)
returns table (out_ok boolean, out_id uuid)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_next int; v_correct int; i int := 0; item jsonb;
begin
  perform app.require_superadmin();

  select count(*)::int into v_correct
  from jsonb_array_elements(p_options) o
  where (o->>'is_correct')::boolean;

  if jsonb_array_length(p_options) < 2 then
    raise exception 'a question needs at least two options';
  end if;
  if v_correct <> 1 then
    raise exception 'exactly one option must be correct, got %', v_correct;
  end if;

  if p_id is null then
    select coalesce(max(q.order_index) + 1, 0) into v_next
    from quiz_questions q where q.quiz_id = p_quiz;

    insert into quiz_questions (quiz_id, prompt, topic, order_index)
    values (p_quiz, btrim(p_prompt), btrim(p_topic), v_next)
    returning id into v_id;
  else
    update quiz_questions q
       set prompt = btrim(p_prompt), topic = btrim(p_topic)
     where q.id = p_id
    returning q.id into v_id;
    delete from quiz_options o where o.question_id = v_id;
  end if;

  for item in select * from jsonb_array_elements(p_options) loop
    insert into quiz_options (question_id, label, is_correct, order_index)
    values (v_id, btrim(item->>'label'),
            coalesce((item->>'is_correct')::boolean, false), i);
    i := i + 1;
  end loop;

  return query select v_id is not null, v_id;
end;
$$;

create or replace function public.su_delete_question(p_id uuid)
returns table (out_ok boolean)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  perform app.require_superadmin();
  delete from quiz_questions q where q.id = p_id;
  get diagnostics n = row_count;
  return query select n = 1;
end;
$$;

create or replace function public.su_set_pass_score(p_quiz uuid, p_score int)
returns table (out_ok boolean)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  perform app.require_superadmin();
  if p_score not between 1 and 100 then
    raise exception 'pass score must be between 1 and 100';
  end if;
  update quizzes q set pass_score = p_score where q.id = p_quiz;
  get diagnostics n = row_count;
  return query select n = 1;
end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.su_extend_access(uuid,int)',
    'public.su_add_seats(uuid,int)',
    'public.su_set_org_status(uuid,org_status)',
    'public.su_set_course_published(uuid,boolean)',
    'public.su_save_module(uuid,uuid,text,text)',
    'public.su_save_lesson(uuid,uuid,text,text,int,text)',
    'public.su_move_lesson(uuid,int)',
    'public.su_delete_lesson(uuid)',
    'public.su_save_question(uuid,uuid,text,text,jsonb)',
    'public.su_delete_question(uuid)',
    'public.su_set_pass_score(uuid,int)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

revoke all on function app.require_superadmin() from public, anon, authenticated;
