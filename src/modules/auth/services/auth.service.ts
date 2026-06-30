import type { Db } from '@/db/index.js'
import type { LoginBody, RegisterBody } from '@/modules/auth/schemas/index.js'
import bcrypt from 'bcryptjs'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { PG_UNIQUE_VIOLATION, ROLES } from '@/common/constants/index.js'
import { AppError, ConflictError, UnauthorizedError } from '@/common/errors/AppError.js'
import { passwordSchema } from '@/common/schemas/index.js'
import { profiles, roles, userRoles, users } from '@/db/schema/index.js'
import { logAudit } from '@/modules/audit-logs/helpers/log-audit.js'

// Constant-time dummy hash used to normalize timing when no dead account exists,
// preventing a timing oracle that distinguishes "email never registered" from
// "email soft-deleted" via the presence/absence of a bcrypt comparison.
const DUMMY_HASH = '$2b$12$Dn0etVDxKuYEzAYFGnb4hO3dJ3P1bLnRMOqFqDjNYr2JHM1vvD7Ui'

export async function registerUser(db: Db, body: RegisterBody) {
  // An email may have at most one active row but several soft-deleted rows
  // (the partial unique index only covers deletedAt IS NULL), so the conflict
  // check must be scoped to active rows specifically.
  const active = await db.query.users.findFirst({ where: and(eq(users.email, body.email), isNull(users.deletedAt)) })
  if (active) {
    // Normalize timing — run a dummy compare so active-conflict responses take
    // the same bcrypt time as the dead-account path, preventing enumeration.
    await bcrypt.compare(body.password, DUMMY_HASH)
    throw new ConflictError('An account with this email already exists')
  }

  // Reactivate a soft-deleted account if the password matches (within the 90-day
  // window before the cleanup cron hard-deletes it). Profile row still exists, so
  // we only clear the soft-delete flags.
  const dead = await db.query.users.findFirst({ where: and(eq(users.email, body.email), isNotNull(users.deletedAt)) })
  if (dead) {
    if (await bcrypt.compare(body.password, dead.passwordHash)) {
      await db.transaction(async (tx) => {
        await tx.update(users).set({ deletedAt: null, deletedBy: null }).where(eq(users.id, dead.id))
        const [userRole] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, ROLES.USER)).limit(1)
        if (userRole)
          await tx.insert(userRoles).values({ userId: dead.id, roleId: userRole.id }).onConflictDoNothing()
      })
      logAudit(db, { userId: dead.id, action: 'auth.account_restored', resourceType: 'user', resourceId: dead.id })
      return { id: dead.id, email: dead.email }
    }
    throw new ConflictError('An account with this email already exists')
  }

  const password = passwordSchema.safeParse(body.password)
  if (!password.success)
    throw new AppError(400, 'VALIDATION_ERROR', password.error.issues[0]?.message ?? 'Invalid password')

  const passwordHash = await bcrypt.hash(body.password, 12)

  try {
    const user = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({ email: body.email, passwordHash })
        .returning({ id: users.id, email: users.email })

      await tx.insert(profiles).values({ userId: row.id })

      // Assign the default 'user' role if seed has been run
      const [userRole] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, ROLES.USER)).limit(1)
      if (userRole)
        await tx.insert(userRoles).values({ userId: row.id, roleId: userRole.id })

      return row
    })
    logAudit(db, { userId: user.id, action: 'auth.registered', resourceType: 'user', resourceId: user.id })
    return user
  }
  catch (err) {
    // Two concurrent registrations of the same new email race past the active
    // check above; the partial unique index rejects the loser with 23505.
    const pgCode = (err as { cause?: { code?: string } })?.cause?.code
    if (pgCode === PG_UNIQUE_VIOLATION)
      throw new ConflictError('An account with this email already exists')
    throw err
  }
}

export async function loginUser(db: Db, body: LoginBody) {
  const user = await db.query.users.findFirst({ where: and(eq(users.email, body.email), isNull(users.deletedAt)) })

  // Always run bcrypt to prevent timing-based email enumeration. When no user
  // is found the DUMMY_HASH comparison ensures a constant-time response.
  const valid = user
    ? await bcrypt.compare(body.password, user.passwordHash)
    : await bcrypt.compare(body.password, DUMMY_HASH).then(() => false)

  if (!user || !valid)
    throw new UnauthorizedError('Invalid email or password')

  return { id: user.id, email: user.email }
}
