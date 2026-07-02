// Vitest sets VITEST_POOL_ID to 1..N per worker process. Each worker gets its
// own Postgres schema (test_worker_<id>) so parallel test files can truncate
// and seed independently instead of racing on a single shared schema.
export function testSchemaName(poolId: string | undefined) {
  return `test_worker_${poolId ?? '1'}`
}
