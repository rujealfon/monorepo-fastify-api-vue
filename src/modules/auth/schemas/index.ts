import { z } from 'zod'

export const registerBodySchema = z.object({
  email: z.email().meta({ examples: ['alice@example.com'] }),
  password: z.string().min(1).max(72).meta({
    description: 'New accounts require uppercase, lowercase, and digit; legacy account reactivation may use the original password.',
    examples: ['SecurePassword1'],
  }),
})

export const loginBodySchema = z.object({
  email: z.email().meta({ examples: ['alice@example.com'] }),
  password: z.string().min(1).meta({ examples: ['SecurePassword1'] }),
})

export const authUserSchema = z.object({
  id: z.uuid().meta({ examples: ['019ee4e4-bd7d-7e0d-8402-eeb73c578a00'] }),
  email: z.email().meta({ examples: ['alice@example.com'] }),
})

export const loginResponseSchema = authUserSchema.extend({
  token: z.string(),
})

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
export type AuthUser = z.infer<typeof authUserSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>

export interface JwtPayload {
  sub: string
  email: string
}
