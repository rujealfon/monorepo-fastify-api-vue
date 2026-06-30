import type { Db } from '@/db/index.js'
import type { CreateRoleBody, UpdateRoleBody } from '@/modules/roles/schemas/index.js'
import { and, asc, eq } from 'drizzle-orm'
import { PG_UNIQUE_VIOLATION } from '@/common/constants/index.js'
import { ConflictError, ForbiddenError, NotFoundError } from '@/common/errors/AppError.js'
import { permissions, rolePermissions, roles } from '@/db/schema/index.js'

function toRole(row: typeof roles.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystemRole: row.isSystemRole,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function findAllRoles(db: Db) {
  const rows = await db.select().from(roles).orderBy(asc(roles.name))
  return rows.map(toRole)
}

export async function findRoleById(db: Db, id: string) {
  const row = await db.query.roles.findFirst({ where: eq(roles.id, id) })
  if (!row)
    throw new NotFoundError('Role', id)
  return toRole(row)
}

function throwIfRoleNameConflict(err: unknown, name: string): never {
  const pgCode = (err as { cause?: { code?: string } })?.cause?.code
  if (pgCode === PG_UNIQUE_VIOLATION)
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
      ...(body.description !== undefined && { description: body.description }),
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
  await db.delete(roles).where(eq(roles.id, id))
}

export async function assignPermissionToRole(db: Db, roleId: string, permId: string, callerIsSuperAdmin = false) {
  const [role, perm] = await Promise.all([
    findRoleById(db, roleId),
    db.query.permissions.findFirst({ where: eq(permissions.id, permId) }),
  ])
  if (role.isSystemRole && !callerIsSuperAdmin)
    throw new ForbiddenError('System role permissions can only be modified by a super-admin')
  if (!perm)
    throw new NotFoundError('Permission', permId)
  await db.insert(rolePermissions).values({ roleId, permissionId: permId }).onConflictDoNothing()
}

export async function removePermissionFromRole(db: Db, roleId: string, permId: string, callerIsSuperAdmin = false) {
  const role = await findRoleById(db, roleId)
  if (role.isSystemRole && !callerIsSuperAdmin)
    throw new ForbiddenError('System role permissions can only be modified by a super-admin')
  await db.delete(rolePermissions).where(
    and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permId)),
  )
}
