import { sql } from 'drizzle-orm'
import { index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

export const products = pgTable('products', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, t => [
  // Serves the list query (filter: deletedAt IS NULL, sort: createdAt) with a
  // single partial index; indexing deletedAt itself would index a constant NULL.
  index('products_live_created_at_idx').on(t.createdAt).where(sql`${t.deletedAt} IS NULL`)
])

export type ProductRow = typeof products.$inferSelect
export type NewProductRow = typeof products.$inferInsert
