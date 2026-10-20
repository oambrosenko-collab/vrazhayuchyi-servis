-- ============================================================
-- Step 1: organizations + users
-- Content tables (courses/modules/lessons) come in step 2 and
-- deliberately carry no organization_id — one course for everyone.
-- ============================================================

create extension if not exists pgcrypto;

create type org_status  as enum ('trial', 'active', 'expired', 'suspended');
create type user_role   as enum ('employee', 'org_admin', 'superadmin');
create type user_status as enum ('active', 'removed');

create table organizations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(btrim(name)) between 2 and 160),
  package_size   int  not null check (package_size between 1 and 1000),
  invite_token   text not null unique,
  -- bumped on every regeneration; old links stop working immediately
  invite_version int  not null default 1,
  expires_at     timestamptz,
  status         org_status not null default 'trial',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- id mirrors auth.users.id — one row per authenticated person.
create table users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  email           text not null,
  full_name       text not null check (length(btrim(full_name)) between 2 and 120),
  role            user_role   not null default 'employee',
  status          user_status not null default 'active',
  joined_at       timestamptz not null default now(),
  removed_at      timestamptz,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- a removed seat must record when it was freed, an active one must not
  constraint users_removed_at_matches_status
    check ((status = 'removed') = (removed_at is not null)),
  -- superadmin is the only role that lives outside an organization
  constraint users_org_required_unless_superadmin
    check (role = 'superadmin' or organization_id is not null)
);

-- One active membership per email per organization. Removed rows stay in
-- history, so the partial index only guards live seats.
create unique index users_one_active_seat_per_email
  on users (organization_id, lower(email))
  where status = 'active';

create index users_by_org        on users (organization_id) where status = 'active';
create index users_by_org_all    on users (organization_id);
create index organizations_token on organizations (invite_token);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organizations_touch before update on organizations
  for each row execute function touch_updated_at();
create trigger users_touch before update on users
  for each row execute function touch_updated_at();
