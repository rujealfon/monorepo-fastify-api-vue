# Optimistic Updates

Two strategies. Pick UI-based when mutation and query live in the same component; cache-based when multiple components read the data.

## Cache-based (canonical pattern)

Five steps inside the mutation hooks — all matter:

```ts
const queryCache = useQueryCache()

const { mutate } = useMutation({
  mutation: (todo: TodoCreate) => createTodo(todo),

  onMutate(todo) {
    // 1. snapshot current cache
    const oldTodos = queryCache.getQueryData<Todo[]>(['todos'])
    // 2. build optimistic value (client temp id if creating)
    const newTodo = { ...todo, id: crypto.randomUUID() }
    const newTodos = [...(oldTodos ?? []), newTodo]
    // 3. write it
    queryCache.setQueryData(['todos'], newTodos)
    // 4. cancel in-flight fetches so a stale response can't overwrite it
    queryCache.cancelQueries({ key: ['todos'] })
    // 5. pass context to other hooks
    return { oldTodos, newTodos }
  },

  onSuccess(serverTodo, _vars, { newTodos }) {
    // replace temp entry with server version (real id)
    const current = queryCache.getQueryData<Todo[]>(['todos'])
    if (current === newTodos) {
      queryCache.setQueryData(
        ['todos'],
        current.map((t) => (t.id === newTodos.at(-1)!.id ? serverTodo : t)),
      )
    }
  },

  onError(_err, _vars, { oldTodos, newTodos }) {
    // rollback ONLY if cache still holds our optimistic value —
    // identity check protects concurrent mutations/refetches
    if (newTodos === queryCache.getQueryData(['todos'])) {
      queryCache.setQueryData(['todos'], oldTodos)
    }
  },

  onSettled() {
    // reconcile with server; don't await → successive mutations stay snappy
    queryCache.invalidateQueries({ key: ['todos'] })
  },
})
```

Why each piece exists:

- **cancelQueries**: an in-flight refetch started before the mutation would resolve after `setQueryData` and clobber the optimistic value.
- **Identity check in onError**: comparing `newTodos === getQueryData(...)` (reference equality) means rollback only happens if nothing else touched the cache since. Skipping this reverts legitimate concurrent updates.
- **Context return from onMutate**: the returned object is the `ctx` argument of `onSuccess`/`onError`/`onSettled` — the only sanctioned channel between hooks.
- **Not awaiting invalidateQueries in onSettled**: awaiting keeps the mutation `loading` until refetch finishes; fine for single submits, blocks rapid successive mutations.

## UI-based (simpler, collocated)

Render the mutation's `variables` while it's loading — no cache writes:

```vue
<li v-for="todo in state.data" :key="todo.id">{{ todo.text }}</li>
<li v-if="asyncStatus === 'loading'" class="pending">{{ variables.text }}</li>
```

Requires invalidating the query in `onSettled` so real data replaces the pending row. For a mutation rendered in a *different* component, give the mutation a `key` and read it elsewhere via `mutationCache.getEntries({ key: ['createTodo'] })` (`.vars`, `.asyncStatus`).

## Typed cache reads

`getQueryData<Todo[]>(...)` needs the manual generic unless keys are typed. `defineQueryOptions` / typed key factories tag keys with their data type, removing the generic.
