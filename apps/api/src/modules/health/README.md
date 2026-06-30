# src/modules/health/

Health check module — liveness, readiness, and system detail probes for orchestrators (Kubernetes, Docker, load balancers) and monitoring systems.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health/live` | **Liveness** — always `200` if the process is running |
| GET | `/health/ready` | **Readiness** — `200` when DB + Valkey are reachable; `503` otherwise |
| GET | `/health/details` | **Details** — heap usage, RSS, event loop delay/utilization, and pressure flag |

## Example responses

### GET /health/ready

```json
// 200 — healthy
{ "success": true, "data": { "status": "ready" } }

// 503 — unhealthy
{ "success": false, "error": { "code": "SERVICE_UNAVAILABLE", "message": "valkey unreachable" } }
```

### GET /health/details

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "memory": {
      "heapUsed": 45678912,
      "rssBytes": 78000000,
      "eventLoopDelay": 2.1,
      "eventLoopUtilized": 0.03
    },
    "underPressure": false
  }
}
```

`status` is `"degraded"` when `@fastify/under-pressure` thresholds are exceeded (heap > 200 MB, RSS > 300 MB, or event loop delay > 1 s). In that state the server is also automatically returning `503` on all incoming requests.

## Under-pressure thresholds (plugins/under-pressure.ts)

| Metric | Limit |
|---|---|
| Event loop delay | 1 000 ms |
| Heap used | 200 MB |
| RSS | 300 MB |
| Event loop utilization | 98% |

## Services

- `checkDb(db)` — executes `SELECT 1`
- `checkValkey(valkey)` — executes `PING`
