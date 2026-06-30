import { z } from 'zod'

export const roleSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  isSystemRole: z.boolean(),
  createdAt: z.iso.datetime(),
})

export const createRoleBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

export const updateRoleBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
})

export type Role = z.infer<typeof roleSchema>
export type CreateRoleBody = z.infer<typeof createRoleBodySchema>
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>
