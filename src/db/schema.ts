import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Drizzle mirror of the schema owned by `supabase/migrations`.
 *
 * Migrations are written as SQL because RLS policies, security-definer
 * functions and grants have no Drizzle equivalent — and those are the parts
 * that must be reviewable line by line. This file exists for typed queries
 * in server code; `drizzle-kit` runs in `--check`/introspect mode only, so
 * it never generates migrations behind the SQL.
 */

export const orgStatus = pgEnum("org_status", [
  "trial",
  "active",
  "expired",
  "suspended",
]);

export const userRole = pgEnum("user_role", [
  "employee",
  "org_admin",
  "superadmin",
]);

export const userStatus = pgEnum("user_status", ["active", "removed"]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    packageSize: integer("package_size").notNull(),
    inviteToken: text("invite_token").notNull().unique(),
    /** Bumped on every regeneration; old links stop working immediately. */
    inviteVersion: integer("invite_version").notNull().default(1),
    /** The buyer's email. Whoever joins with it becomes org_admin. */
    adminEmail: text("admin_email"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: orgStatus("status").notNull().default("trial"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("organizations_token").on(t.inviteToken)],
);

export const users = pgTable(
  "users",
  {
    /** Mirrors auth.users.id — one row per authenticated person. */
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    role: userRole("role").notNull().default("employee"),
    /** Freeing a seat sets this to 'removed'; the row and its progress stay. */
    status: userStatus("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Removed rows stay in history, so this only guards live seats.
    uniqueIndex("users_one_active_seat_per_email")
      .on(t.organizationId, sql`lower(${t.email})`)
      .where(sql`status = 'active'`),
    index("users_by_org").on(t.organizationId).where(sql`status = 'active'`),
    index("users_by_org_all").on(t.organizationId),
    check(
      "users_removed_at_matches_status",
      sql`(status = 'removed') = (removed_at is not null)`,
    ),
    check(
      "users_org_required_unless_superadmin",
      sql`role = 'superadmin' or organization_id is not null`,
    ),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
