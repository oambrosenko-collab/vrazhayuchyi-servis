-- ============================================================
-- Step 2: the course itself.
--
-- Content belongs to nobody. courses, modules and lessons carry no
-- organization_id on purpose — the platform teaches one thing, service
-- on the floor, and everyone gets the same course. That decision is what
-- makes "one course for all" cost nothing.
-- ============================================================

create table courses (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title        text not null check (length(btrim(title)) between 2 and 160),
  description  text,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  title       text not null check (length(btrim(title)) between 2 and 160),
  summary     text,
  order_index int  not null check (order_index >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (course_id, order_index) deferrable initially deferred
);

create table lessons (
  id             uuid primary key default gen_random_uuid(),
  module_id      uuid not null references modules(id) on delete cascade,
  title          text not null check (length(btrim(title)) between 2 and 160),
  description    text,
  -- Null until the video is uploaded to Bunny. A lesson without it still
  -- renders, with a placeholder player, so the course can be built before
  -- anything is filmed.
  bunny_video_id text,
  duration_sec   int not null check (duration_sec between 1 and 36000),
  -- [{ "title": "...", "url": "..." }] — downloadable handouts. A table
  -- would be tidier, but these are links and nothing queries inside them.
  materials      jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(materials) = 'array'),
  order_index    int not null check (order_index >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (module_id, order_index) deferrable initially deferred
);

-- One row per person per lesson.
--
-- Two numbers, not one, because they answer different questions.
-- `position_sec` is where to drop the needle when they come back.
-- `watched_sec` is how much they actually watched, accumulated from real
-- playback time rather than read off the scrubber — dragging to the end
-- must not count as having watched. The owner's report is only worth
-- something if this number is honest.
create table lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  lesson_id    uuid not null references lessons(id) on delete cascade,
  position_sec int not null default 0 check (position_sec >= 0),
  watched_sec  int not null default 0 check (watched_sec >= 0),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index lessons_by_module         on lessons (module_id, order_index);
create index modules_by_course         on modules (course_id, order_index);
create index lesson_progress_by_user   on lesson_progress (user_id);
create index lesson_progress_by_lesson on lesson_progress (lesson_id);

create trigger courses_touch         before update on courses
  for each row execute function touch_updated_at();
create trigger modules_touch         before update on modules
  for each row execute function touch_updated_at();
create trigger lessons_touch         before update on lessons
  for each row execute function touch_updated_at();
create trigger lesson_progress_touch before update on lesson_progress
  for each row execute function touch_updated_at();
