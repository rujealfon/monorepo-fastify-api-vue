import type { PiniaColadaOptions } from '@pinia/colada'

export const coladaOptions: PiniaColadaOptions = {
  queryOptions: {
    // Data counts as fresh for 30s — no automatic refetch within that window.
    staleTime: 30_000
  }
}
