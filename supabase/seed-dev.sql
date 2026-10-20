-- Local development seed. Creates one restaurant to click around in.
--
-- There is deliberately no password account here. An earlier version seeded
-- one to work around email delivery, which meant a working credential for a
-- live project sitting in a public repo — the publishable key is public by
-- design, so that combination is an open door. Sign in with the magic link
-- instead; it works end to end.
--
-- `admin_email` is what matters below: the first person to join with that
-- address becomes org_admin automatically and lands in /admin rather than
-- /learn. Point it at your own inbox.

select
  o.name,
  'http://localhost:3000/join/' || o.invite_token as invite_url,
  o.expires_at::date as access_until
from app.provision_organization(
  'Кав''ярня «Тераса»',   -- name
  10,                      -- seats
  'you@example.com',       -- admin_email — replace with your own
  12                       -- months of access
) o;
