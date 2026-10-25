-- Every other RPC in this schema returns a row set, even a one-column
-- one (lookup_invite included) — a bare scalar boolean was the odd one
-- out, and it broke the generic FunctionReturns<T> helper in
-- src/lib/supabase/types.ts, which assumes every function's Returns is
-- an array. Match the convention instead of special-casing the helper.

drop function if exists public.lookup_view_invite(text);

create or replace function public.lookup_view_invite(p_token text)
returns table (out_valid boolean)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from view_invites where token = p_token);
$$;

revoke all on function public.lookup_view_invite(text) from public;
grant execute on function public.lookup_view_invite(text) to anon, authenticated;
