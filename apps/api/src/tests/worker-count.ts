// Shared between vitest.config.ts (worker pool size) and global-setup.ts
// (number of Postgres schemas to provision) so the two stay in lockstep.
export const TEST_WORKER_COUNT = 4
