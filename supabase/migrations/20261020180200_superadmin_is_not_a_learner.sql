-- ============================================================
-- One rule, applied everywhere a person is counted: the platform owner
-- is not a student of any restaurant.
--
-- A superadmin may be attached to an organization (handy while
-- reviewing, and the check constraint allows it), but counting them as
-- an occupied seat overcharges the customer and counting their 0%
-- against the class average makes the report lie. Before this, the
-- overview and the restaurant card disagreed — 37% against 31% — for
-- exactly that reason.
-- ============================================================

create or replace function public.org_overview()
returns table (
  id uuid, name text, package_size int, seats_taken int, seats_left int,
  invite_token text, expires_at timestamptz, status org_status,
  cumulative_users int, cumulative_limit int
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    o.id, o.name, o.package_size,
    t.taken,
    greatest(o.package_size - t.taken, 0),
    case when (select app.is_org_admin()) or (select app.is_superadmin())
         then o.invite_token else null end,
    o.expires_at, o.status, c.total, o.package_size * 3
  from organizations o
  cross join lateral (
    select count(*)::int as taken from users u
    where u.organization_id = o.id and u.status = 'active'
      and u.role <> 'superadmin'
  ) t
  cross join lateral (
    select count(*)::int as total from users u
    where u.organization_id = o.id and u.role <> 'superadmin'
  ) c
  where o.id = (select app.org_id());
$$;

create or replace function public.lookup_invite(p_token text)
returns table (
  out_valid boolean, out_reason text, out_org_name text,
  out_seats_total int, out_seats_taken int
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  o organizations;
  taken int;
begin
  select * into o from organizations org where org.invite_token = p_token;

  if o.id is null then
    return query select false, 'invalid_link', null::text, null::int, null::int; return;
  end if;

  select count(*)::int into taken
  from users u
  where u.organization_id = o.id and u.status = 'active'
    and u.role <> 'superadmin';

  if o.status = 'suspended' then
    return query select false, 'suspended', o.name, o.package_size, taken;
  elsif o.expires_at is not null and o.expires_at < now() then
    return query select false, 'expired', o.name, o.package_size, taken;
  elsif taken >= o.package_size then
    return query select false, 'no_seats', o.name, o.package_size, taken;
  else
    return query select true, 'ok', o.name, o.package_size, taken;
  end if;
end;
$$;

create or replace function public.team_report()
returns table (
  user_id uuid, full_name text, email text,
  role user_role, status user_status,
  joined_at timestamptz, removed_at timestamptz, last_seen_at timestamptz,
  lessons_done int, lessons_total int, percent int
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with total as (
    select count(*)::int as n
    from lessons l
    join modules m on m.id = l.module_id
    join courses c on c.id = m.course_id
    where c.is_published
  )
  select
    u.id, u.full_name, u.email, u.role, u.status,
    u.joined_at, u.removed_at, u.last_seen_at,
    coalesce(d.n, 0),
    total.n,
    case when total.n = 0 then 0
         else floor(100.0 * coalesce(d.n, 0) / total.n)::int end
  from users u
  cross join total
  left join lateral (
    select count(*)::int as n
    from lesson_progress lp
    where lp.user_id = u.id and lp.completed_at is not null
  ) d on true
  where u.organization_id = (select app.org_id())
    and u.role <> 'superadmin'
    and ((select app.is_org_admin()) or (select app.is_superadmin()))
  order by (u.status = 'removed'), u.joined_at;
$$;

-- Joining must not let a superadmin eat a seat either.
drop function if exists public.join_organization(text, text);

create function public.join_organization(p_token text, p_full_name text)
returns table (out_ok boolean, out_reason text, out_org_id uuid, out_role user_role)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text;
  v_name  text := btrim(p_full_name);
  v_role  user_role;
  o       organizations;
  existing users;
  v_found boolean;
  taken   int;
begin
  if v_uid is null then
    return query select false, 'not_authenticated', null::uuid, null::user_role; return;
  end if;

  select au.email into v_email from auth.users au where au.id = v_uid;

  if length(v_name) < 2 or length(v_name) > 120 then
    return query select false, 'bad_name', null::uuid, null::user_role; return;
  end if;

  select * into o from organizations org where org.invite_token = p_token for update;

  if o.id is null then
    return query select false, 'invalid_link', null::uuid, null::user_role; return;
  end if;

  if o.status = 'suspended' then
    return query select false, 'suspended', null::uuid, null::user_role; return;
  end if;

  if o.expires_at is not null and o.expires_at < now() then
    return query select false, 'expired', null::uuid, null::user_role; return;
  end if;

  select * into existing from users u where u.id = v_uid;
  v_found := existing.id is not null;

  if v_found and existing.organization_id = o.id and existing.status = 'active' then
    return query select true, 'already_member', o.id, existing.role; return;
  end if;

  if v_found and existing.status = 'active' and existing.organization_id <> o.id then
    return query select false, 'member_of_other_org', null::uuid, null::user_role; return;
  end if;

  v_role := case
    when v_found and existing.role = 'superadmin' then 'superadmin'::user_role
    when o.admin_email is not null
     and lower(btrim(o.admin_email)) = lower(btrim(coalesce(v_email, '')))
      then 'org_admin'::user_role
    else 'employee'::user_role
  end;

  -- The owner does not consume a seat, so the limit does not apply to them.
  if v_role <> 'superadmin' then
    select count(*)::int into taken
    from users u where u.organization_id = o.id and u.status = 'active'
      and u.role <> 'superadmin';

    if taken >= o.package_size then
      return query select false, 'no_seats', null::uuid, null::user_role; return;
    end if;
  end if;

  if v_found then
    update users u set
      organization_id = o.id,
      full_name       = v_name,
      email           = coalesce(v_email, existing.email),
      status          = 'active',
      removed_at      = null,
      role            = v_role,
      joined_at       = now()
    where u.id = v_uid;
  else
    insert into users (id, organization_id, email, full_name, role, status)
    values (v_uid, o.id, v_email, v_name, v_role, 'active');
  end if;

  return query select true, 'joined', o.id, v_role;
end;
$$;

revoke all on function public.join_organization(text, text) from public, anon;
grant execute on function public.join_organization(text, text) to authenticated;
