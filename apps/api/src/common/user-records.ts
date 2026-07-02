import bcrypt from 'bcryptjs'
import process from 'node:process'

import type { Tx } from '@/db/index.js'

import { profiles, users } from '@/db/schema/index.js'

// bcryptjs is pure-JS (no native binding); cost 12 is slow enough in tests to
// dominate suite runtime given the number of register/login calls, so tests use
// a lower cost. Production keeps cost 12.
const PASSWORD_HASH_COST = process.env.NODE_ENV === 'test' ? 4 : 12

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
