import { pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'
import { roles } from './roles.js'

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  scope: text('scope').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('permissions_resource_action_scope_unique').on(t.resource, t.action, t.scope),
])

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, t => [
  primaryKey({ columns: [t.roleId, t.permissionId] }),
])

export type PermissionRow = typeof permissions.$inferSelect
