# Error Handling

## Semantics

- A query/mutation errors only when the function **throws or rejects**. `fetch` resolves on 4xx/5xx — throw explicitly:

```ts
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

query: async () => {
  const res = await fetch('/api/todos')
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return res.json()
}
```

- On a failed **refetch**, previous `data` is retained. Show stale data plus a non-blocking error notice instead of blanking the screen.
- Mutations: `mutate()` swallows (error lands in `state.error`, `onError` fires); `mutateAsync()` rethrows after hooks. `reset()` clears error/data back to pending.

## Global handlers

Mutations — via install options:

```ts
app.use(PiniaColada, {
  mutationOptions: {
    onError(error) {
      if (error instanceof ApiError) toast.error(error.message)
    },
  },
})
```

Queries — via the hooks plugin, driven by per-query `meta`:

```ts
import { PiniaColadaQueryHooksPlugin } from '@pinia/colada'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onError(_error, entry) {
        if (entry.meta?.errorMessage) toast.error(entry.meta.errorMessage as string)
      },
    }),
  ],
})

// per query:
useQuery({ key: ['todos'], query: fetchTodos, meta: { errorMessage: 'Failed to load todos' } })
```

Don't toast every error indiscriminately — filter by type, or use subtle UI (status bar).

## Type-safe errors

Global default error type:

```ts
declare module '@pinia/colada' {
  interface TypesConfig {
    defaultError: ApiError // or `unknown` to force narrowing everywhere
  }
}
```

`state` is a discriminated union on `status` — `if (state.value.status === 'error')` narrows `state.value.error`. In templates, narrow locally with `instanceof`:

```vue
<ForbiddenError v-if="error instanceof AuthError" :error="error" />
<div v-else-if="error">{{ error.message }}</div>
```

## Retries

The Retry plugin (`@pinia/colada-plugin-retry`) retries failed queries with configurable count/delay/error filter; the error surfaces only after retries exhaust.
