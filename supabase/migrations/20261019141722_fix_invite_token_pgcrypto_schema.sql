-- pgcrypto lives in the `extensions` schema on Supabase, and every
-- function here pins search_path to public — so qualify it explicitly.
create or replace function app.new_invite_token()
returns text language sql volatile
set search_path = extensions, pg_temp as $$
  -- 144 bits, url-safe. Not guessable, so the link itself is the secret.
  select rtrim(
    translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_'),
    '='
  );
$$;
