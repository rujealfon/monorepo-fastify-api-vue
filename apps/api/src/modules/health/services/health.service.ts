import type { GlideClient } from '@valkey/valkey-glide'

import { sql } from 'drizzle-orm'

import type { Db } from '@/db/index.js'

export async function checkDb(db: Db): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`)
    return true
  }
  catch {
    return false
  }
}

export async function checkValkey(valkey: GlideClient): Promise<boolean> {
  try {
    const result = await valkey.ping()
    return result === 'PONG'
  }
  catch {
    return false
  }
}
