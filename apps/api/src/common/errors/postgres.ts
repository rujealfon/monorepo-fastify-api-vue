import { PG_UNIQUE_VIOLATION } from '@/common/constants/index.js'

export function isUniqueViolation(err: unknown) {
  return (err as { cause?: { code?: string } })?.cause?.code === PG_UNIQUE_VIOLATION
}
