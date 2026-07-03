---
name: pinia-colada
description: Pinia Colada (@pinia/colada) data-fetching layer for Vue 3 — useQuery, useMutation, query keys, cache invalidation, optimistic updates, pagination. Use whenever writing or reviewing async data fetching in Vue components or composables — fetching lists/details from an API, submitting forms that modify server data, cache invalidation after a mutation, loading/error states, pagination, or infinite scroll — even if the user doesn't name Pinia Colada. Also use when the user mentions useQuery, useMutation, defineQuery, query keys, staleTime, or TanStack-Query-style patterns in a Vue app.
metadata:
  version: "2026.07"
  source: Generated from https://pinia-colada.esm.dev
---

# Pinia Colada

> Data-fetching layer built on Pinia. Queries read server data (GET); mutations write it (POST/PUT/PATCH/DELETE). Requires Pinia. Always prefer `useQuery`/`useMutation` over hand-rolled `ref` + `onMounted` fetch state.

## Setup

```ts
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

app.use(createPinia())
app.use(PiniaColada, {
  queryOptions: { staleTime: 0 }, // global defaults, optional
  mutationOptions: {},
  plugins: [],
})
```

Install: `npm i @pinia/colada` (Pinia must already be installed and registered first).

## Queries

```ts
const { state, data, error, status, asyncStatus, refresh, refetch } = useQuery({
  key: () => ['contacts', route.params.id], // getter fn when key depends on reactive values
  query: () => api.contacts.get({ params: { id: route.params.id } }),
})
```

Key options:

| Option | Meaning |
|--------|---------|
| `key` | Cache identity. Array of serializable values. Use a getter `() => [...]` (or computed/ref) whenever it depends on reactive state — plain arrays don't react. |
| `query` | Promise-returning function. Takes no args — read params from the closure and mirror them in `key`. |
| `enabled` | Boolean or getter; pause query until true (e.g. `() => !!route.params.id`). |
| `staleTime` | How long cached data counts as fresh (no auto refetch). |
| `gcTime` | How long unused entries stay in cache. |
| `placeholderData` | Shown while pending; `(prev) => prev` keeps previous page during pagination. |

State semantics — two independent axes:

- `status` (data state): `'pending' | 'success' | 'error'`. Discriminated union on `state.value` — checking `status === 'error'` narrows `error` type.
- `asyncStatus` (fetch state): `'idle' | 'loading'`. `loading` is true on refetches even when stale data is displayed.

`refresh()` dedupes and respects `staleTime`; `refetch()` always hits the network.

**Rule: every reactive variable used inside `query` must appear in `key`.** Otherwise the cache serves stale data for the new params.

## Query keys

- Arrays of strings/numbers/objects: `['products']`, `['products', id]`, `['products', id, { withComments: true }]`.
- `1` vs `'1'` are different keys. Object property order irrelevant; array order matters.
- Hierarchical: invalidating `['products', id]` also invalidates `['products', id, {...}]` children.
- Avoid hard-coded key literals scattered around — use a key factory:

```ts
export const CONTACT_KEYS = {
  root: ['contacts'] as const,
  byId: (id: string) => [...CONTACT_KEYS.root, id] as const,
}
```

- `defineQueryOptions` bundles key + query with inferred types for reuse:

```ts
const contactByIdQuery = defineQueryOptions((id: string) => ({
  key: CONTACT_KEYS.byId(id),
  query: () => getContact(id),
}))
// in component: useQuery(contactByIdQuery, () => route.params.id as string)
```

## Mutations

```ts
const queryCache = useQueryCache()
const { mutate, mutateAsync, state, asyncStatus, reset } = useMutation({
  mutation: (contact: ContactPatch) => api.contacts.update({ body: contact }),
  onSettled: () => queryCache.invalidateQueries({ key: CONTACT_KEYS.root }),
})
```

- `mutate(vars)` — fire-and-forget, errors caught into `state.error`, never throws.
- `mutateAsync(vars)` — returns promise, rethrows; wrap in try/catch.
- Hooks: `onMutate(vars)` → `onSuccess(data, vars, ctx)` / `onError(err, vars, ctx)` → `onSettled(data, err, vars, ctx)`. Object returned from `onMutate` becomes `ctx` in the others.
- Returning a promise from a hook (e.g. awaiting `invalidateQueries`) keeps `asyncStatus` at `loading` until refetch completes.
- Global mutation hooks via `mutationOptions` at plugin install (e.g. global error toast).

## Invalidation

```ts
const queryCache = useQueryCache() // valid in setup, Pinia stores, nav guards — not module top-level
queryCache.invalidateQueries({ key: ['contacts'] })          // + children
queryCache.invalidateQueries({ key: ['contacts'], exact: true })
queryCache.invalidateQueries()                                // everything
```

Invalidation marks entries stale; only *active* queries (mounted components) refetch immediately, inactive ones refetch on next use. Pass `'all'` as second arg to force-refetch inactive too. Standard pattern: invalidate in `onSettled` of the mutation that changed the data.

## Reuse: which tool

| Situation | Use |
|-----------|-----|
| One component needs the query | `useQuery` inline (or in a plain composable) |
| Reuse key+query definition, state stays per-component | `defineQueryOptions` |
| Multiple mounted components must share state (e.g. a search ref driving the key) | `defineQuery(() => { ...useQuery()... })` — setup runs once globally, refs are shared |

```ts
export const useFilteredContacts = defineQuery(() => {
  const search = ref('')
  const query = useQuery({
    key: () => ['contacts', { search: search.value }],
    query: () => searchContacts(search.value),
  })
  return { ...query, search }
})
```

## Pagination

```ts
const { state, asyncStatus } = useQuery({
  key: () => ['contacts', { page: Number(route.query.page) || 1 }],
  query: () => listContacts(Number(route.query.page) || 1),
  placeholderData: (prev) => prev, // keep previous page visible while next loads
})
```

With `placeholderData`, `status` stays `'success'` but `asyncStatus` is `'loading'` — use `asyncStatus` for the spinner. For "load more" that merges pages into one list, use `useInfiniteQuery()` instead.

## Error handling essentials

- Only thrown/rejected values become errors. `fetch` doesn't throw on 4xx/5xx — check `response.ok` and throw a typed error in the query function.
- On refetch failure, previous `data` is kept — show stale data + error notice, don't blank the UI.
- Per-query error messages: put `meta: { errorMessage: '...' }` on the query and read it in a global `PiniaColadaQueryHooksPlugin` `onError`.
- Type errors globally: `declare module '@pinia/colada' { interface TypesConfig { defaultError: ApiError } }`.

Details and global-handler setup: [references/error-handling.md](references/error-handling.md).

## Optimistic updates

Full pattern (setQueryData in `onMutate`, cancelQueries, identity-checked rollback in `onError`, invalidate in `onSettled`): [references/optimistic-updates.md](references/optimistic-updates.md). Read it before writing any optimistic-update code — naive versions lose concurrent updates.

## Review checklist

When reviewing Pinia Colada code, flag:

- Reactive value used in `query` but missing from `key` (stale-cache bug).
- Plain-array `key` that should be a getter (loses reactivity).
- Mutation without invalidation or optimistic update — UI won't refresh.
- `mutateAsync` without try/catch.
- Manual `ref`/`onMounted` fetch code that should be a `useQuery`.
- `useQueryCache()` called at module top level (must be inside setup/store/guard).
