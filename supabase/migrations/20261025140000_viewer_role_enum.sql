-- ============================================================
-- A fourth role: read-only access to all three areas, for a demo
-- link anyone can be handed — a recruiter, a prospective client — to
-- look around without the owner's email and without touching anything.
--
-- Split into its own migration because Postgres will not let a new
-- enum value be used in the same transaction that adds it; the access
-- that actually uses 'viewer' follows in the next migration.
-- ============================================================

alter type user_role add value 'viewer';
