-- The buyer's email, captured at checkout. The first person to join with
-- it gets org_admin automatically — no manual promotion step, which
-- matters because the first clients are provisioned by hand in minutes.
alter table organizations add column if not exists admin_email text;

-- The admin dashboard header, in one round trip.
create or replace function public.org_overview()
returns table (
  id uuid, name text, package_size int, seats_taken int, seats_left int,
  invite_token text, expires_at timestamptz, status org_status,
  -- soft abuse guard from the PRD: 3x package size over 12 months.
  cumulative_users int, cumulative_limit int
)
language sql stable security definer
set search_path = public, pg_temp as $$
  select
    o.id, o.name, o.package_size,
    t.taken,
    greatest(o.package_size - t.taken, 0),
    -- only an admin needs the link; employees must not be able to reshare it
    case when (select app.is_org_admin()) or (select app.is_superadmin())
         then o.invite_token else null end,
    o.expires_at, o.status, c.total, o.package_size * 3
  from organizations o
  cross join lateral (
    select count(*)::int as taken from users u
    where u.organization_id = o.id and u.status = 'active'
  ) t
  cross join lateral (
    select count(*)::int as total from users u
    where u.organization_id = o.id
  ) c
  where o.id = (select app.org_id());
$$;

revoke all on function public.org_overview() from public;
grant execute on function public.org_overview() to authenticated;
