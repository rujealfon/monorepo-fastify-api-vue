import { boolean, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'
import { users } from './users.js'

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  description: text('description'),
  isSystemRole: boolean('is_system_role').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('roles_name_unique').on(t.name),
])

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, t => [
  primaryKey({ columns: [t.userId, t.roleId] }),
])

export type RoleRow = typeof roles.$inferSelect
export type NewRoleRow = typeof roles.$inferInsert
