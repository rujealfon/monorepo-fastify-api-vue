import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by')
}, t => [
  // ponytail: partial index so deleted users don't block re-registration.
  // Indexed on lower(email) so the constraint holds even if a write path
  // (e.g. a future migration script) skips the Zod .toLowerCase() transform.
  uniqueIndex('users_email_unique').on(sql`lower(${t.email})`).where(sql`${t.deletedAt} IS NULL`),
  // Speeds up the soft-deleted-account reactivation lookup in registerUser,
  // which filters by email + deletedAt IS NOT NULL and sorts by deletedAt desc.
  index('users_email_deleted_at_idx').on(t.email, t.deletedAt).where(sql`${t.deletedAt} IS NOT NULL`)
])

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
