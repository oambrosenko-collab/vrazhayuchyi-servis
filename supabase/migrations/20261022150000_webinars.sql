-- ============================================================
-- Step 5: webinars — the rhythm that makes a year worth buying.
--
-- The course is the entry ticket and it is finished in a few shifts.
-- What a restaurant pays twelve months for is one webinar a month: a new
-- set of techniques, plus the recording for whoever was on shift. The
-- positioning behind this table is in CLAUDE.md and in the PRD section
-- «Вебінари — те, що перетворює курс на рік».
--
-- No organization_id, exactly like the course: one platform-wide
-- schedule open to every venue at once. Private per-venue sessions are
-- out of scope by decision — they do not scale with self-serve.
-- ============================================================

create table webinars (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(btrim(title)) between 2 and 160),
  description text,
  starts_at   timestamptz not null,
  duration_min int not null default 60 check (duration_min between 10 and 240),
  -- Zoom or Meet. We keep the link and nothing else: owning the stream
  -- would be months of work and no value on top of what Zoom already does.
  join_url      text check (join_url is null or join_url ~ '^https://'),
  -- Appears after the broadcast; until then the card says so out loud.
  recording_url text check (recording_url is null or recording_url ~ '^https://'),
  is_published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A dozen rows a year. One index on the only ordering anyone asks for.
create index webinars_by_start on webinars (starts_at desc);

-- ------------------------------------------------------------
-- What the platform actually knows about attendance.
--
-- A Zoom link and an externally hosted recording give no playback
-- signal. We can see that someone opened them from their cabinet, and
-- nothing more. Calling that «був на вебінарі» in the owner's report
-- would be the same lie as a manual "I watched it" checkbox — which this
-- product already refuses on lessons, where real playback is measured.
--
-- So the row records a *touch* and names its source, and every screen
-- that shows the number says what it means. When recordings move to
-- Bunny, the recording half can graduate to the 90% rule that lessons
-- use, and this table gains a watched_sec rather than changing meaning.
-- ------------------------------------------------------------
create type webinar_touch as enum ('live', 'recording');

create table webinar_touches (
  id         uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references webinars(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  source     webinar_touch not null,
  created_at timestamptz not null default now(),
  -- Opening the same recording twice is one touch, not two. Attending
  -- live and rewatching later is two, because both are true.
  unique (webinar_id, user_id, source)
);

create index webinar_touches_by_user on webinar_touches (user_id, created_at desc);
create index webinar_touches_by_webinar on webinar_touches (webinar_id);

create trigger webinars_touch_updated_at before update on webinars
  for each row execute function touch_updated_at();
