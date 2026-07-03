import { sql } from 'drizzle-orm'

import type { Tx } from '@/db/index.js'

import { ForbiddenError } from '@/common/errors/AppError.js'

/**
 * Serializes concurrent role-permission mutations for the same role (used by
 * both assignPermissionToRole and assignRoleToUser) so a permission-bundle
 * check can't be raced by a concurrent grant landing between the check and
 * the caller's write. Must be called inside the same transaction as the
 * check + write it protects.
 */
export async function lockRoleForPermissionChange(tx: Tx, roleId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${roleId}))`)
}

/** Canonical `resource:action:scope` string used throughout the permission system. */
export function formatPermission(perm: { resource: string, action: string, scope: string }): string {
  return `${perm.resource}:${perm.action}:${perm.scope}`
}

/**
 * A caller can only grant permissions (directly, or bundled into a role) that
 * they already hold themselves — otherwise anyone who can edit roles or
 * assign them could hand out privileges beyond their own. Super-admins
 * bypass this check.
 */
export function assertCallerHoldsPermissions(
  callerIsSuperAdmin: boolean,
  callerPermissions: string[],
  targetPerms: Array<{ resource: string, action: string, scope: string }>,
  message: string
) {
  if (callerIsSuperAdmin)
    return
  const missing = targetPerms.some(perm => !callerPermissions.includes(formatPermission(perm)))
  if (missing)
    throw new ForbiddenError(message)
}
