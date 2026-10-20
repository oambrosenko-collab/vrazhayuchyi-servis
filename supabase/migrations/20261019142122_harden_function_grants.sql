-- Supabase grants EXECUTE on everything in `public` to anon and
-- authenticated by default. Each function already guards itself, but an
-- unauthenticated caller has no business reaching any of them except the
-- invite preview, so cut the grant rather than rely on the guard alone.

revoke execute on function public.join_organization(text, text)                from anon;
revoke execute on function public.release_seat(uuid)                           from anon;
revoke execute on function public.regenerate_invite()                          from anon;
revoke execute on function public.org_overview()                               from anon;
revoke execute on function public.su_provision_organization(text,int,text,int) from anon;

-- Not part of the client API at all: provisioning core and the trigger fn.
revoke execute on function app.provision_organization(text,int,text,int) from anon, authenticated;
revoke execute on function public.touch_updated_at()                     from anon, authenticated, public;

-- A trigger function with a mutable search_path can be hijacked by a
-- caller-controlled schema. Pin it.
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.touch_updated_at() from anon, authenticated, public;

-- Default for anything added later in these schemas.
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema app    revoke execute on functions from anon, authenticated;
