import bcrypt from 'bcryptjs'
import { and, count, eq, isNull } from 'drizzle-orm'

import type { Db, Tx } from '@/db/index.js'
import type { CreateUserBody, UpdateUserBody } from '@/modules/users/schemas/index.js'

import { PG_UNIQUE_VIOLATION, ROLES } from '@/common/constants/index.js'
import { ConflictError, ForbiddenError, NotFoundError } from '@/common/errors/AppError.js'
import { assertCallerHoldsPermissions, lockRoleForPermissionChange } from '@/common/permissions.js'
import { profiles, rolePermissions, roles, userRoles, users } from '@/db/schema/index.js'

const userColumns = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const

const profileColumns = {
  firstName: true,
  lastName: true,
  avatarUrl: true,
  bio: true,
  phoneNumber: true,
  birthDate: true,
} as const

const userRolesRelation = {
  with: { role: { columns: { id: true, name: true } } },
} as const

// Locks the surviving super-admin rows for the duration of the caller's
// transaction so a concurrent delete/removal of another super-admin can't
// also read the count before either commit (TOCTOU on the "last super-admin"
// invariant). Joins on the role name directly so callers never need a
// separate role-id lookup; returns [] if the super-admin role doesn't exist.
async function lockSuperAdminHolders(tx: Tx) {
  return tx
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(roles.name, ROLES.SUPER_ADMIN), isNull(users.deletedAt)))
    .for('update')
}

// Only throws when `targetUserId` is itself one of the surviving super-admins
// — an operation on a user who doesn't currently hold the role must never be
// blocked just because the system happens to have exactly one super-admin.
async function assertNotLastSuperAdmin(tx: Tx, targetUserId: string, message: string) {
  const holders = await lockSuperAdminHolders(tx)
  if (holders.some(h => h.userId === targetUserId) && holders.length <= 1)
    throw new ForbiddenError(message)
}

type UserRow = {
  id: string
  email: string
  createdAt: Date
  updatedAt: Date
  profile: {
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
    bio: string | null
    phoneNumber: string | null
    birthDate: string | null
  } | null
  userRoles?: { role: { id: string, name: string } }[]
}

function toUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    profile: row.profile ?? {
      firstName: null,
      lastName: null,
      avatarUrl: null,
      bio: null,
      phoneNumber: null,
      birthDate: null,
    },
    roles: (row.userRoles ?? []).map(ur => ({ id: ur.role.id, name: ur.role.name })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function findAllUsers(db: Db, page: number, limit: number) {
  const [rows, [{ total }]] = await Promise.all([
    db.query.users.findMany({
      columns: userColumns,
      with: { profile: { columns: profileColumns }, userRoles: userRolesRelation },
      where: isNull(users.deletedAt),
      offset: (page - 1) * limit,
      limit,
    }),
    db.select({ total: count() }).from(users).where(isNull(users.deletedAt)),
  ])
  return { data: rows.map(toUser), total }
}

export async function findUserById(db: Db | Tx, id: string) {
  const row = await db.query.users.findFirst({
    columns: userColumns,
    with: { profile: { columns: profileColumns }, userRoles: userRolesRelation },
    where: and(eq(users.id, id), isNull(users.deletedAt)),
  })
  if (!row)
    throw new NotFoundError('User', id)
  return toUser(row)
}

export async function createUser(db: Db, body: CreateUserBody) {
  const existing = await db.query.users.findFirst({ where: and(eq(users.email, body.email), isNull(users.deletedAt)) })
  if (existing)
    throw new ConflictError(`Email '${body.email}' is already registered`)

  const passwordHash = await bcrypt.hash(body.password, 12)

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({ email: body.email, passwordHash })
        .returning({ id: users.id, email: users.email, createdAt: users.createdAt, updatedAt: users.updatedAt })

      await tx.insert(profiles).values({ userId: row.id })

      // Profile row was just inserted but not returned; pass null and let toUser
      // fill in the empty shape so the response contract is always complete.
      return toUser({ ...row, profile: null })
    })
  }
  catch (err) {
    const pgCode = (err as { cause?: { code?: string } })?.cause?.code
    if (pgCode === PG_UNIQUE_VIOLATION)
      throw new ConflictError(`Email '${body.email}' is already registered`)
    throw err
  }
}

export async function updateUser(db: Db, id: string, body: UpdateUserBody) {
  await findUserById(db, id)

  try {
    await db.transaction(async (tx) => {
      if (body.email !== undefined) {
        await tx.update(users).set({ email: body.email }).where(eq(users.id, id))
      }
      if (body.profile !== undefined) {
        await tx.update(profiles).set(body.profile).where(eq(profiles.userId, id))
      }
    })
  }
  catch (err) {
    const pgCode = (err as { cause?: { code?: string } })?.cause?.code
    if (pgCode === PG_UNIQUE_VIOLATION)
      throw new ConflictError(`Email '${body.email}' is already registered`)
    throw err
  }

  return findUserById(db, id)
}

export async function deleteUser(db: Db, id: string, deletedBy?: string) {
  await findUserById(db, id)
  await db.transaction(async (tx) => {
    // Lock every role this user currently holds before touching user_roles —
    // without it, a concurrent assignRoleToUser/assignPermissionToRole for one
    // of these roles isn't serialized against this delete, and a role grant
    // could land on this user right after the delete clears their roles here
    // but before this transaction commits. Locked in sorted order across all
    // held roles so two deleteUser calls (or a deleteUser and a deleteRole)
    // can't deadlock by acquiring the same set of locks in different orders.
    const heldRoleIds = await tx.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, id))
    for (const roleId of heldRoleIds.map(r => r.roleId).sort())
      await lockRoleForPermissionChange(tx, roleId)
    // Re-checked fresh inside the transaction (not from a pre-transaction
    // snapshot) so a role grant landing between findUserById and here can't
    // let this guard be skipped (TOCTOU on "cannot delete the last super-admin").
    await assertNotLastSuperAdmin(tx, id, 'Cannot delete the last super-admin')
    await tx.delete(userRoles).where(eq(userRoles.userId, id))
    await tx.update(users).set({ deletedAt: new Date(), deletedBy: deletedBy ?? null }).where(eq(users.id, id))
  })
}

export async function assignRoleToUser(db: Db, userId: string, roleId: string, callerIsSuperAdmin = false, callerPermissions: string[] = []) {
  const [, role] = await Promise.all([
    findUserById(db, userId),
    db.query.roles.findFirst({ where: eq(roles.id, roleId) }),
  ])
  if (!role)
    throw new NotFoundError('Role', roleId)
  if (role.isSystemRole && !callerIsSuperAdmin)
    throw new ForbiddenError('System roles can only be assigned by a super-admin')
  await db.transaction(async (tx) => {
    // Always take the lock, even for super-admin callers — advisory locks only
    // provide mutual exclusion between sessions that both attempt to acquire
    // them, so if either side of this race (this function or
    // assignPermissionToRole) skips locking, the other side's lock is worthless.
    await lockRoleForPermissionChange(tx, roleId)
    // A caller can only assign a role whose permissions they already hold
    // themselves — otherwise anyone with user:assign-role:any could self-assign
    // a pre-existing, more-privileged non-system role and inherit permissions
    // they were never individually granted.
    if (!callerIsSuperAdmin) {
      const rolePerms = await tx.query.rolePermissions.findMany({ where: eq(rolePermissions.roleId, roleId), with: { permission: true } })
      assertCallerHoldsPermissions(callerIsSuperAdmin, callerPermissions, rolePerms.map(rp => rp.permission), 'Cannot assign a role that grants permissions you do not hold yourself')
    }
    await tx.insert(userRoles).values({ userId, roleId }).onConflictDoNothing()
  })
}

export async function removeRoleFromUser(db: Db, userId: string, roleId: string, callerIsSuperAdmin = false) {
  const [, role] = await Promise.all([
    findUserById(db, userId),
    db.query.roles.findFirst({ where: eq(roles.id, roleId) }),
  ])
  if (!role)
    throw new NotFoundError('Role', roleId)
  if (role.isSystemRole && !callerIsSuperAdmin)
    throw new ForbiddenError('System roles can only be removed by a super-admin')
  await db.transaction(async (tx) => {
    // Take the same lock as assignRoleToUser/assignPermissionToRole/deleteRole
    // — without it, this removal isn't serialized against a concurrent
    // deleteRole cascading away this role's user_roles rows, reopening the
    // race those locks exist to close.
    await lockRoleForPermissionChange(tx, roleId)
    if (role.name === ROLES.SUPER_ADMIN)
      await assertNotLastSuperAdmin(tx, userId, 'Cannot remove the last super-admin')
    await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
  })
}
