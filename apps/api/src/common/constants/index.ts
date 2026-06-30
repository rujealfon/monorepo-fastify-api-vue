/** Postgres error codes — https://www.postgresql.org/docs/current/errcodes-appendix.html */
export const PG_UNIQUE_VIOLATION = '23505'

/** User roles for access control. */
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const

/** Permission strings used by requirePermission and assertSelfOrAdmin. */
export const PERMISSIONS = {
  USER: {
    READ_ANY: 'user:read:any',
    CREATE_ANY: 'user:create:any',
    UPDATE_ANY: 'user:update:any',
    DELETE_ANY: 'user:delete:any',
    READ_OWN: 'user:read:own',
    UPDATE_OWN: 'user:update:own',
  },
  ROLE: {
    READ_ANY: 'role:read:any',
    CREATE_ANY: 'role:create:any',
    UPDATE_ANY: 'role:update:any',
    DELETE_ANY: 'role:delete:any',
  },
  PERMISSION: {
    READ_ANY: 'permission:read:any',
  },
  PRODUCT: {
    READ_ANY: 'product:read:any',
    CREATE_ANY: 'product:create:any',
    UPDATE_ANY: 'product:update:any',
    DELETE_ANY: 'product:delete:any',
  },
  AUDIT_LOG: {
    READ_ANY: 'audit-log:read:any',
  },
  METRICS: {
    READ_ANY: 'metrics:read:any',
  },
  HEALTH: {
    READ_DETAILS: 'health:read:details',
  },
} as const
