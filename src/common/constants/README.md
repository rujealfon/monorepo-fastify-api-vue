# constants

Shared application-wide constants.

| Export | Value | Purpose |
|---|---|---|
| `PG_UNIQUE_VIOLATION` | `'23505'` | Postgres unique constraint error code — used to detect duplicate-email conflicts |
| `ROLES` | `{ USER, ADMIN }` | User role values for access control checks |
