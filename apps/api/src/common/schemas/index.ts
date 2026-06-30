import { z } from 'zod'

export const passwordSchema = z.string()
  .min(8)
  .max(72)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  )

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).meta({ examples: [1] }),
  limit: z.coerce.number().int().min(1).max(100).default(10).meta({ examples: [10] }),
})

export const uuidParamSchema = z.object({
  id: z.uuid().meta({ examples: ['019ee4e4-bd7d-7e0d-8402-eeb73c578a00'] }),
})

export const paginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
})

const apiErrorFieldSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
  message: z.string(),
})

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.array(apiErrorFieldSchema).optional(),
  }),
})

export function apiSuccessSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  })
}

export function apiListSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: paginationSchema,
  })
}

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type Pagination = z.infer<typeof paginationSchema>
export type UuidParam = z.infer<typeof uuidParamSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
