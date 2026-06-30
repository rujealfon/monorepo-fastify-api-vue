# src/common/errors/

Typed HTTP error classes. All defined in `AppError.ts` and caught by the global `setErrorHandler` in `app.ts`.

## Hierarchy

```
AppError (base)           AppError.ts
├── NotFoundError       → 404 NOT_FOUND
├── UnauthorizedError   → 401 UNAUTHORIZED
├── ForbiddenError      → 403 FORBIDDEN
├── ConflictError       → 409 CONFLICT
└── ValidationError     → 422 VALIDATION_ERROR
```

## AppError shape

All subclasses serialise to the standard error envelope:

```ts
{
  success: false
  error: {
    code: string    // machine-readable, SCREAMING_SNAKE_CASE
    message: string // human-readable
  }
}
```

HTTP status is set via the response status code; it is not repeated in the body.

## Usage

```ts
import { NotFoundError } from '@/common/errors/AppError.js'

if (!user)
  throw new NotFoundError('User', id)
```

## Adding a new error type

Add the subclass directly in `AppError.ts`:

```ts
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message)
  }
}
```

No other changes required — the existing error handler handles all `AppError` subclasses.
