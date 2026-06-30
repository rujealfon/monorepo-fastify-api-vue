import { z } from 'zod'
import { paginationQuerySchema, passwordSchema, uuidParamSchema } from '@/common/schemas/index.js'

export const profileSchema = z.object({
  firstName: z.string().nullable().meta({ examples: ['John'] }),
  lastName: z.string().nullable().meta({ examples: ['Doe'] }),
  avatarUrl: z.string().nullable().meta({ examples: ['https://example.com/avatar.jpg'] }),
  bio: z.string().nullable().meta({ examples: ['Software engineer based in NYC'] }),
  phoneNumber: z.string().nullable().meta({ examples: ['+1234567890'] }),
  birthDate: z.string().nullable().meta({ examples: ['1990-01-15'] }),
})

export const embeddedRoleSchema = z.object({
  id: z.uuid().meta({ examples: ['019ee4e4-bd7d-7e0d-8402-eeb73c578a01'] }),
  name: z.string().meta({ examples: ['admin'] }),
})

export const userSchema = z.object({
  id: z.uuid().meta({ examples: ['019ee4e4-bd7d-7e0d-8402-eeb73c578a00'] }),
  email: z.email().meta({ examples: ['user@example.com'] }),
  profile: profileSchema,
  roles: z.array(embeddedRoleSchema),
  createdAt: z.iso.datetime().meta({ examples: ['2024-01-15T10:30:00.000Z'] }),
  updatedAt: z.iso.datetime().meta({ examples: ['2024-01-15T10:30:00.000Z'] }),
})

export const createUserBodySchema = z.object({
  email: z.email().meta({ examples: ['user@example.com'] }),
  password: passwordSchema.meta({ examples: ['SecurePassword1'] }),
})

export const updateProfileBodySchema = z.object({
  firstName: z.string().nullable().optional().meta({ description: 'First name', examples: ['John'] }),
  lastName: z.string().nullable().optional().meta({ description: 'Last name', examples: ['Doe'] }),
  avatarUrl: z.url().nullable().optional().meta({ description: 'Avatar URL', examples: ['https://example.com/avatar.jpg'] }),
  bio: z.string().nullable().optional().meta({ description: 'Short bio', examples: ['Software engineer based in NYC'] }),
  phoneNumber: z.string().nullable().optional().meta({ description: 'Phone number', examples: ['+1234567890'] }),
  birthDate: z.string().nullable().optional().meta({ description: 'Birth date (YYYY-MM-DD)', examples: ['1990-01-15'] }),
})

export const updateUserBodySchema = z
  .object({
    email: z.email().optional().meta({ description: 'Email address', examples: ['user@example.com'] }),
    profile: updateProfileBodySchema.optional().meta({ description: 'Profile fields to update' }),
  })
  .refine(data => data.email !== undefined || data.profile !== undefined, {
    message: 'At least one field must be provided (email or profile)',
  })

export { uuidParamSchema as userParamsSchema, paginationQuerySchema as userQuerySchema }

export type User = z.infer<typeof userSchema>
export type CreateUserBody = z.infer<typeof createUserBodySchema>
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
