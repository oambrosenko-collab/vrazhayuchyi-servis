-- ============================================================
-- Provisioning. The first clients are set up by hand in two
-- minutes — this is that two minutes.
-- ============================================================

create or replace function app.provision_organization(
  p_name text, p_package_size int, p_admin_email text, p_months int default 12
)
returns organizations language plpgsql volatile
set search_path = public, pg_temp as $$
declare o organizations;
begin
  insert into organizations (name, package_size, admin_email, expires_at, status)
  values (btrim(p_name), p_package_size, lower(btrim(p_admin_email)),
          now() + make_interval(months => p_months), 'active')
  returning * into o;
  return o;
end;
$$;

-- Thin superadmin-gated wrapper, so /su can call the same path later.
create or replace function public.su_provision_organization(
  p_name text, p_package_size int, p_admin_email text, p_months int default 12
)
returns table (id uuid, name text, invite_token text, expires_at timestamptz)
language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare o organizations;
begin
  if not (select app.is_superadmin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  o := app.provision_organization(p_name, p_package_size, p_admin_email, p_months);
  return query select o.id, o.name, o.invite_token, o.expires_at;
end;
$$;

revoke all on function public.su_provision_organization(text, int, text, int) from public;
grant execute on function public.su_provision_organization(text, int, text, int) to authenticated;
