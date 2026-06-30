import type { z } from 'zod'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface RouteSchema<
  TQuery extends z.ZodType | undefined = undefined,
  TParams extends z.ZodType | undefined = undefined,
  TBody extends z.ZodType | undefined = undefined,
  TResponses extends Record<number, z.ZodType> = Record<number, z.ZodType>,
> {
  method: HttpMethod
  path: string
  auth?: boolean
  optionalAuth?: boolean
  permission?: string
  tags?: string[]
  rateLimit?: { max: number, timeWindow: string }
  query?: TQuery
  params?: TParams
  body?: TBody
  responses: TResponses
}

export type RouteMap = Record<string, {
  method: HttpMethod
  path: string
  auth?: boolean
  optionalAuth?: boolean
  permission?: string
  tags?: string[]
  rateLimit?: { max: number, timeWindow: string }
  query?: z.ZodType
  params?: z.ZodType
  body?: z.ZodType
  responses: Record<number, z.ZodType>
}>
