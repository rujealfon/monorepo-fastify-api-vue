# utils/

Stateless helper functions with no framework dependencies. Anything here must be pure or rely only on Node.js built-ins — no Fastify, no Drizzle, no external services.

Add a file per concern (e.g. `date.ts`, `string.ts`). Import via the path alias:

```ts
import { someHelper } from '@/utils/some-helper.js'
```
