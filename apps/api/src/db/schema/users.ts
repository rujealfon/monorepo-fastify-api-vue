import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
}, t => [
  // ponytail: partial index so deleted users don't block re-registration
  uniqueIndex('users_email_unique').on(t.email).where(sql`${t.deletedAt} IS NULL`),
])

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
