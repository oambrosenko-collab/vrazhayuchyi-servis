-- A function without a pinned search_path can be redirected by whatever
-- schema the caller puts first. Harmless for a constant today, not worth
-- leaving as the one unpinned function in the schema.
create or replace function app.completion_ratio()
returns numeric
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$ select 0.90::numeric $$;

revoke execute on function app.completion_ratio() from anon, authenticated, public;
