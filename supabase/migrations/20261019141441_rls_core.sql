-- ============================================================
-- RLS. The one place where a mistake costs reputation, not comfort.
--
-- Policies must never read `users` directly: a policy on users that
-- queries users recurses. Everything goes through security-definer
-- helpers in a private schema that bypass RLS by design.
-- ============================================================

create schema if not exists app;
revoke all on schema app from anon, authenticated;
grant usage on schema app to authenticated;

create or replace function app.current_user_row()
returns users language sql stable security definer
set search_path = public, pg_temp as $$
  select * from users where id = (select auth.uid());
$$;

create or replace function app.org_id()
returns uuid language sql stable security definer
set search_path = public, pg_temp as $$
  select organization_id from users
  where id = (select auth.uid()) and status = 'active';
$$;

create or replace function app.is_superadmin()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from users
    where id = (select auth.uid()) and role = 'superadmin' and status = 'active'
  );
$$;

create or replace function app.is_org_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from users
    where id = (select auth.uid()) and role = 'org_admin' and status = 'active'
  );
$$;

revoke all on function app.current_user_row() from public, anon;
revoke all on function app.org_id()          from public, anon;
revoke all on function app.is_superadmin()   from public, anon;
revoke all on function app.is_org_admin()    from public, anon;
grant execute on function app.org_id(), app.is_superadmin(), app.is_org_admin()
  to authenticated;

-- Deny by default. No INSERT/UPDATE/DELETE policies exist for clients at
-- all: every write goes through a definer RPC, so there is no surface
-- where a forged payload reaches a row.
alter table organizations enable row level security;
alter table users         enable row level security;
alter table organizations force row level security;
alter table users         force row level security;

revoke all on organizations from anon, authenticated;
revoke all on users         from anon, authenticated;
grant select on organizations to authenticated;
grant select on users         to authenticated;

create policy organizations_read_own on organizations
  for select to authenticated
  using (id = (select app.org_id()) or (select app.is_superadmin()));

-- Own row stays readable even after the seat is freed, so an ex-employee
-- gets the "access revoked" screen instead of an empty crash.
create policy users_read_self on users
  for select to authenticated
  using (id = (select auth.uid()));

create policy users_read_same_org on users
  for select to authenticated
  using (
    organization_id is not null
    and organization_id = (select app.org_id())
  );

create policy users_read_all_superadmin on users
  for select to authenticated
  using ((select app.is_superadmin()));
