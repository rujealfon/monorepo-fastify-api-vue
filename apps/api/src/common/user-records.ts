import bcrypt from 'bcryptjs'

import type { Tx } from '@/db/index.js'

import { profiles, users } from '@/db/schema/index.js'

const PASSWORD_HASH_COST = 12

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_HASH_COST)
}

export async function insertUserWithProfile(tx: Tx, values: { email: string, passwordHash: string }) {
  const [row] = await tx
    .insert(users)
    .values(values)
    .returning({ id: users.id, email: users.email, createdAt: users.createdAt, updatedAt: users.updatedAt })

  await tx.insert(profiles).values({ userId: row.id })

  return row
}
