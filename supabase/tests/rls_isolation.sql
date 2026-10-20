-- ============================================================
-- Tenant isolation test. Two restaurants, one tries to read the
-- other. This is the one test that must pass before every release:
-- a leak here costs reputation, not comfort.
--
-- Run it against a throwaway database or a branch, never production —
-- it seeds and deletes rows. With the Supabase CLI:
--   supabase db execute --file supabase/tests/rls_isolation.sql
-- Every row of the final SELECT must read PASS.
-- ============================================================

begin;

create temp table rls_results(check_name text, expected text, got text, ok boolean)
  on commit drop;
grant insert, select on rls_results to authenticated, anon;

-- ---------- seed ----------
do $$
declare
  a organizations; b organizations;
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
begin
  a := app.provision_organization('RLS Test A', 2, 'owner-a@rlstest.invalid', 12);
  b := app.provision_organization('RLS Test B', 5, 'owner-b@rlstest.invalid', 12);

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values
    (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'owner-a@rlstest.invalid', '', now(), now(), now()),
    (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'waiter-b@rlstest.invalid', '', now(), now(), now());

  insert into users (id, organization_id, email, full_name, role, status)
  values
    (ua, a.id, 'owner-a@rlstest.invalid',  'Owner A',  'org_admin', 'active'),
    (ub, b.id, 'waiter-b@rlstest.invalid', 'Waiter B', 'employee',  'active');
end $$;

-- ---------- act as the admin of restaurant A ----------
do $$
declare
  ua uuid; ub uuid; ida uuid; idb uuid;
  n int; token_b text; res record; got_name text;
begin
  select o.id into ida from organizations o where o.name = 'RLS Test A';
  select o.id, o.invite_token into idb, token_b
    from organizations o where o.name = 'RLS Test B';
  select u.id into ua from users u where u.email = 'owner-a@rlstest.invalid';
  select u.id into ub from users u where u.email = 'waiter-b@rlstest.invalid';

  -- exactly how PostgREST presents an authenticated request
  perform set_config('request.jwt.claims',
    json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- reads stop at the tenant boundary
  select count(*) into n from organizations;
  insert into rls_results values ('organizations visible to A', '1', n::text, n = 1);

  select count(*) into n from organizations where id = idb;
  insert into rls_results values ('A reads org B directly', '0', n::text, n = 0);

  select count(*) into n from users;
  insert into rls_results values ('users visible to A', '1', n::text, n = 1);

  select count(*) into n from users where organization_id = idb;
  insert into rls_results values ('A reads team of B', '0', n::text, n = 0);

  select count(*) into n from users where id = ub;
  insert into rls_results values ('A reads B waiter by id', '0', n::text, n = 0);

  -- there is no client write surface at all
  begin
    update users set full_name = 'hacked' where id = ub;
    get diagnostics n = row_count;
    insert into rls_results values ('A updates B waiter', 'blocked', 'updated ' || n, false);
  exception when insufficient_privilege then
    insert into rls_results values ('A updates B waiter', 'blocked', 'permission denied', true);
  end;

  begin
    update organizations set package_size = 9999 where id = ida;
    get diagnostics n = row_count;
    insert into rls_results values ('A inflates own package_size', 'blocked', 'updated ' || n, false);
  exception when insufficient_privilege then
    insert into rls_results values ('A inflates own package_size', 'blocked', 'permission denied', true);
  end;

  begin
    delete from users where id = ub;
    get diagnostics n = row_count;
    insert into rls_results values ('A deletes B waiter', 'blocked', 'deleted ' || n, false);
  exception when insufficient_privilege then
    insert into rls_results values ('A deletes B waiter', 'blocked', 'permission denied', true);
  end;

  -- the RPCs are scoped to the caller's own organization
  select * into res from public.release_seat(ub);
  insert into rls_results values ('A releases B seat', 'forbidden', res.out_reason,
                                  res.out_reason = 'forbidden');

  select count(*) into n from public.org_overview();
  insert into rls_results values ('org_overview rows for A', '1', n::text, n = 1);

  select o.name into got_name from public.org_overview() o;
  insert into rls_results values ('org_overview org name', 'RLS Test A', got_name,
                                  got_name = 'RLS Test A');

  -- another restaurant's invite token must be unreachable
  select count(*) into n from organizations where invite_token = token_b;
  insert into rls_results values ('A finds B invite token', '0', n::text, n = 0);

  reset role;
end $$;

-- ---------- act as anonymous ----------
do $$
declare n int; inv record; tok_a text;
begin
  select o.invite_token into tok_a from organizations o where o.name = 'RLS Test A';

  perform set_config('request.jwt.claims', null, true);
  set local role anon;

  begin
    select count(*) into n from organizations;
    insert into rls_results values ('anon reads organizations', 'no grant', 'returned ' || n, false);
  exception when insufficient_privilege then
    insert into rls_results values ('anon reads organizations', 'no grant', 'permission denied', true);
  end;

  begin
    select count(*) into n from users;
    insert into rls_results values ('anon reads users', 'no grant', 'returned ' || n, false);
  exception when insufficient_privilege then
    insert into rls_results values ('anon reads users', 'no grant', 'permission denied', true);
  end;

  -- the invite preview is the one thing anon may call
  select * into inv from public.lookup_invite(tok_a);
  insert into rls_results values ('anon lookup_invite works', 'true', inv.out_valid::text,
                                  inv.out_valid);
  insert into rls_results values ('anon lookup_invite name', 'RLS Test A', inv.out_org_name,
                                  inv.out_org_name = 'RLS Test A');

  select * into inv from public.lookup_invite('definitely-not-a-token');
  insert into rls_results values ('anon lookup_invite bogus', 'invalid_link', inv.out_reason,
                                  inv.out_reason = 'invalid_link');

  reset role;
end $$;

select
  check_name,
  expected,
  got,
  case when ok then 'PASS' else 'FAIL' end as result
from rls_results
order by ok, check_name;

-- Nothing is kept: the seed exists only for the length of this test.
rollback;
