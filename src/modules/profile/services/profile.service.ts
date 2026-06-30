import type { Db } from '@/db/index.js'
import { findUserById } from '@/modules/users/services/user.service.js'

export async function getProfile(db: Db, userId: string) {
  return findUserById(db, userId)
}
