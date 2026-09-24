/** Explicit opt-in loopback PostgreSQL; no application environment or providers.
 * SCU G03 / S3 — standalone workout-draft requestKey idempotency gate.
 * Frozen G01 configs/commands untouched.
 */
import { defineConfig } from 'vitest/config';
export default defineConfig({ envDir: false, test: {
  environment: 'node', setupFiles: [], fileParallelism: false, retry: 0,
  include: ['tests/integration/coachWorkoutDraft.postgres.test.mjs'],
  testTimeout: 30000, hookTimeout: 30000,
} });
