import { z } from 'zod'

export const permissionSchema = z.object({
  id: z.uuid(),
  resource: z.string(),
  action: z.string(),
  scope: z.string(),
  description: z.string().nullable(),
  createdAt: z.iso.datetime(),
})

export type Permission = z.infer<typeof permissionSchema>
