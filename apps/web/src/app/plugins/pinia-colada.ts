import type { RpcError } from '@monorepo-fastify-api-vue/api-client'
import type { PiniaColadaOptions } from '@pinia/colada'

import { PiniaColadaAutoRefetch } from '@pinia/colada-plugin-auto-refetch'

// Every query error comes from the api-client, which throws RpcError on
// non-2xx responses — type `error` accordingly across all queries.
declare module '@pinia/colada' {
  // eslint-disable-next-line ts/consistent-type-definitions -- module augmentation requires interface merging
  interface TypesConfig {
    defaultError: RpcError
  }
}

export const coladaOptions: PiniaColadaOptions = {
  // Enables per-query `autoRefetch` (off by default) — see health queries.
  plugins: [PiniaColadaAutoRefetch()],
  queryOptions: {
    // Data counts as fresh for 30s — no automatic refetch within that window.
    staleTime: 30_000
  }
}
