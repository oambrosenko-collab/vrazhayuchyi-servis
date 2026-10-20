-- Superseded in part by 20261019141628 and 20261019142007, which rebuild
-- these functions. Kept so the migration history matches what was applied.

create or replace function app.new_invite_token()
returns text language sql volatile as $$
  -- 144 bits, url-safe. Not guessable, so the link itself is the secret.
  select rtrim(translate(encode(gen_random_bytes(18), 'base64'), '+/', '-_'), '=');
$$;

alter table organizations
  alter column invite_token set default app.new_invite_token();
