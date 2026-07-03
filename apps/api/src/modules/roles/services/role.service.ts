import { and, asc, count, eq } from 'drizzle-orm'

import type { Db } from '@/db/index.js'
import type { CreateRoleBody, UpdateRoleBody } from '@/modules/roles/schemas/index.js'

import { ConflictError, ForbiddenError, NotFoundError } from '@/common/errors/AppError.js'
import { isUniqueViolation } from '@/common/errors/postgres.js'
import { resolvePage } from '@/common/pagination.js'
import { assertCallerHoldsPermissions, lockRoleForPermissionChange } from '@/common/permissions.js'
import { permissions, rolePermissions, roles } from '@/db/schema/index.js'

function toRole(row: typeof roles.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystemRole: row.isSystemRole,
    createdAt: row.createdAt.toISOString()
  }
}

export async function findAllRoles(db: Db, page: number, limit: number) {
  const { rows, total } = await resolvePage(
    db.select().from(roles).orderBy(asc(roles.name)).offset((page - 1) * limit).limit(limit),
    db.select({ total: count() }).from(roles)
  )
  return { data: rows.map(toRole), total }
}

export async function findRoleById(db: Db, id: string) {
  const row = await db.query.roles.findFirst({ where: eq(roles.id, id) })
  if (!row)
    throw new NotFoundError('Role', id)
  return toRole(row)
}

function throwIfRoleNameConflict(err: unknown, name: string): never {
  if (isUniqueViolation(err))
    throw new ConflictError(`Role name '${name}' already exists`)
  throw err
}

export async function createRole(db: Db, body: CreateRoleBody) {
  try {
    const [row] = await db.insert(roles).values({ ...body, isSystemRole: false }).returning()
    return toRole(row)
  }
  catch (err) {
    throwIfRoleNameConflict(err, body.name)
  }
}

export async function updateRole(db: Db, id: string, body: UpdateRoleBody, callerIsSuperAdmin = false) {
  const existing = await findRoleById(db, id)
  if (existing.isSystemRole && !callerIsSuperAdmin)
    throw new ForbiddenError('System roles cannot be modified')
  if (existing.isSystemRole && body.name !== undefined && body.name !== existing.name)
    throw new ForbiddenError('System role names cannot be changed')
  try {
    const [row] = await db.update(roles).set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description })
    }).where(eq(roles.id, id)).returning()
    if (!row)
      throw new NotFoundError('Role', id)
    return toRole(row)
  }
  catch (err) {
    if (err instanceof NotFoundError)
      throw err
    throwIfRoleNameConflict(err, body.name ?? id)
  }
}

export async function deleteRole(db: Db, id: string) {
  const role = await findRoleById(db, id)
  if (role.isSystemRole)
    throw new ForbiddenError('System roles cannot be deleted')
  await db.transaction(async (tx) => {
    // Take the same lock assignPermissionToRole/assignRoleToUser use before
    // mutating this role's permissions/assignments — without it, a delete can
    // race a concurrent grant: the insert commits, then the FK cascade on
    // role_permissions/user_roles silently removes the row just inserted.
    await lockRoleForPermissionChange(tx, id)
    await tx.delete(roles).where(eq(roles.id, id))
  })
}

export async function assignPermissionToRole(db: Db, roleId: string, permId: string, callerIsSuperAdmin = false, callerPermissions: string[] = []) {
  const [role, perm] = await Promise.all([
    findRoleById(db, roleId),
    db.query.permissions.findFirst({ where: eq(permissions.id, permId) })
  ])
  if (role.isSystemRole && !callerIsSuperAdmin)
    throw new ForbiddenError('System role permissions can only be modified by a super-admin')
  if (!perm)
    throw new NotFoundError('Permission', permId)
  await db.transaction(async (tx) => {
    // Always take the lock, even for super-admin callers — advisory locks only
    // provide mutual exclusion between sessions that both attempt to acquire
    // them, so if either side of this race (this function or
    // assignRoleToUser) skips locking, the other side's lock is worthless.
    await lockRoleForPermissionChange(tx, roleId)
    // A caller can only grant permissions they already hold themselves — otherwise
    // anyone with role:update:any could build a role with permissions beyond their
    // own (e.g. user:assign-role:any) and self-assign it via that role.
    assertCallerHoldsPermissions(callerIsSuperAdmin, callerPermissions, [perm], 'Cannot grant a permission you do not hold yourself')
    await tx.insert(rolePermissions).values({ roleId, permissionId: permId }).onConflictDoNothing()
  })
}

export async function removePermissionFromRole(db: Db, roleId: string, permId: string, callerIsSuperAdmin = false) {
  const [role, perm] = await Promise.all([
    findRoleById(db, roleId),
    db.query.permissions.findFirst({ where: eq(permissions.id, permId) })
  ])
  if (role.isSystemRole && !callerIsSuperAdmin)
    throw new ForbiddenError('System role permissions can only be modified by a super-admin')
  if (!perm)
    throw new NotFoundError('Permission', permId)
  await db.transaction(async (tx) => {
    // Take the same lock as assignPermissionToRole/assignRoleToUser/deleteRole
    // — without it, this removal isn't serialized against a concurrent
    // deleteRole cascading away role_permissions for the same role, or a
    // concurrent grant, reopening the race those locks exist to close.
    await lockRoleForPermissionChange(tx, roleId)
    await tx.delete(rolePermissions).where(
      and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permId))
    )
  })
}
