import { z } from 'zod'
import { paginationQuerySchema, uuidParamSchema } from '@/common/schemas/index.js'

export const productSchema = z.object({
  id: z.uuid().meta({ examples: ['019ee4e4-bd7d-7e0d-8402-eeb73c578a01'] }),
  name: z.string().meta({ examples: ['Wireless Headphones'] }),
  price: z.string().meta({ examples: ['49.99'] }),
  stock: z.number().int().meta({ examples: [100] }),
  createdAt: z.iso.datetime().meta({ examples: ['2024-01-15T10:30:00.000Z'] }),
  updatedAt: z.iso.datetime().meta({ examples: ['2024-01-15T10:30:00.000Z'] }),
})

export const createProductBodySchema = z.object({
  name: z.string().min(1).max(200).meta({ examples: ['Wireless Headphones'] }),
  price: z.number().min(0).meta({ examples: [49.99] }),
  stock: z.number().int().min(0).default(0).meta({ examples: [100] }),
})

export const updateProductBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional().meta({ examples: ['Wireless Headphones Pro'] }),
    price: z.number().min(0).optional().meta({ examples: [59.99] }),
    stock: z.number().int().min(0).optional().meta({ examples: [150] }),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export { uuidParamSchema as productParamsSchema, paginationQuerySchema as productQuerySchema }

export type Product = z.infer<typeof productSchema>
export type CreateProductBody = z.infer<typeof createProductBodySchema>
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>
