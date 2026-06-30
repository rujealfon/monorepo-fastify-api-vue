import type { Db } from '@/db/index.js'
import type { CreateUserBody, UpdateUserBody } from '@/modules/users/schemas/index.js'
import bcrypt from 'bcryptjs'
import { and, count, eq, isNull } from 'drizzle-orm'
import { PG_UNIQUE_VIOLATION, ROLES } from '@/common/constants/index.js'
import { ConflictError, ForbiddenError, NotFoundError } from '@/common/errors/AppError.js'
import { profiles, roles, userRoles, users } from '@/db/schema/index.js'

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

interface UserRow {
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

export async function findUserById(db: Db, id: string) {
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

  return db.transaction(async (tx) => {
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
  const superAdminRole = await db.query.roles.findFirst({ where: eq(roles.name, ROLES.SUPER_ADMIN) })
  if (superAdminRole) {
    const userHasRole = await db.query.userRoles.findFirst({ where: and(eq(userRoles.userId, id), eq(userRoles.roleId, superAdminRole.id)) })
    if (userHasRole) {
      const [{ total }] = await db.select({ total: count() }).from(userRoles).innerJoin(users, eq(users.id, userRoles.userId)).where(and(eq(userRoles.roleId, superAdminRole.id), isNull(users.deletedAt)))
      if (total <= 1)
        throw new ForbiddenError('Cannot delete the last super-admin')
    }
  }
  await db.delete(userRoles).where(eq(userRoles.userId, id))
  await db.update(users).set({ deletedAt: new Date(), deletedBy: deletedBy ?? null }).where(eq(users.id, id))
}

export async function assignRoleToUser(db: Db, userId: string, roleId: string, callerIsSuperAdmin = false) {
  const [, role] = await Promise.all([
    findUserById(db, userId),
    db.query.roles.findFirst({ where: eq(roles.id, roleId) }),
  ])
  if (!role)
    throw new NotFoundError('Role', roleId)
  if (role.isSystemRole && !callerIsSuperAdmin)
    throw new ForbiddenError('System roles can only be assigned by a super-admin')
  await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing()
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
  if (role.name === ROLES.SUPER_ADMIN) {
    const [{ total }] = await db.select({ total: count() }).from(userRoles).innerJoin(users, eq(users.id, userRoles.userId)).where(and(eq(userRoles.roleId, roleId), isNull(users.deletedAt)))
    if (total <= 1)
      throw new ForbiddenError('Cannot remove the last super-admin')
  }
  await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
}
