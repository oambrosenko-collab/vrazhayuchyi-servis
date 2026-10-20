-- OUT parameters share a namespace with column names inside plpgsql.
-- `organization_id` as an OUT param made every `where organization_id = ...`
-- ambiguous and broke joining outright. OUT params now carry an out_ prefix
-- and every column reference is table-qualified.
--
-- This migration is the authoritative definition of all four client RPCs.

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

  -- Lock the org: without this two people can take the same last seat.
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

  select count(*)::int into taken
  from users u where u.organization_id = o.id and u.status = 'active';

  if taken >= o.package_size then
    return query select false, 'no_seats', null::uuid, null::user_role; return;
  end if;

  v_role := case
    when v_found and existing.role = 'superadmin' then 'superadmin'::user_role
    when o.admin_email is not null
     and lower(btrim(o.admin_email)) = lower(btrim(coalesce(v_email, '')))
      then 'org_admin'::user_role
    else 'employee'::user_role
  end;

  if v_found then
    -- Returning employee: the row survived removal, so does their progress.
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

drop function if exists public.release_seat(uuid);

create function public.release_seat(p_user_id uuid)
returns table (out_ok boolean, out_reason text)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := (select app.org_id());
  target users;
begin
  if not (select app.is_org_admin()) and not (select app.is_superadmin()) then
    return query select false, 'forbidden'; return;
  end if;

  select * into target from users u where u.id = p_user_id;
  if target.id is null then
    return query select false, 'not_found'; return;
  end if;

  -- Scoped to the caller's own org unless superadmin.
  if not (select app.is_superadmin()) and target.organization_id is distinct from v_org then
    return query select false, 'forbidden'; return;
  end if;

  if target.id = (select auth.uid()) then
    return query select false, 'cannot_remove_self'; return;
  end if;

  if target.status = 'removed' then
    return query select true, 'already_removed'; return;
  end if;

  -- Soft delete: progress and certificates stay, the seat comes back.
  update users u set status = 'removed', removed_at = now() where u.id = p_user_id;
  return query select true, 'released';
end;
$$;

drop function if exists public.regenerate_invite();

create function public.regenerate_invite()
returns table (out_ok boolean, out_reason text, out_invite_token text)
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := (select app.org_id());
  v_new text;
begin
  if not (select app.is_org_admin()) and not (select app.is_superadmin()) then
    return query select false, 'forbidden', null::text; return;
  end if;
  if v_org is null then
    return query select false, 'no_org', null::text; return;
  end if;

  v_new := app.new_invite_token();
  update organizations org
     set invite_token   = v_new,
         invite_version = org.invite_version + 1
   where org.id = v_org;

  -- Already-joined people keep access; only the old link dies.
  return query select true, 'regenerated', v_new;
end;
$$;

drop function if exists public.lookup_invite(text);

-- Public, pre-auth: what /join/[token] renders before login. Returns one
-- row with a reason the UI can branch on; never raises, because
-- "посилання недійсне" is a screen, not a 500.
create function public.lookup_invite(p_token text)
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
  from users u where u.organization_id = o.id and u.status = 'active';

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

revoke all on function public.lookup_invite(text)           from public;
revoke all on function public.join_organization(text, text) from public;
revoke all on function public.release_seat(uuid)            from public;
revoke all on function public.regenerate_invite()           from public;

grant execute on function public.lookup_invite(text)           to anon, authenticated;
grant execute on function public.join_organization(text, text) to authenticated;
grant execute on function public.release_seat(uuid)            to authenticated;
grant execute on function public.regenerate_invite()           to authenticated;
