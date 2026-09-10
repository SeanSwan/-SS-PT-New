/** Isolated actual-model semantic read-back tests; never imports application env. */
import { defineConfig } from 'vitest/config';
export default defineConfig({ envDir: false, test: {
  environment: 'node', setupFiles: [], fileParallelism: false, retry: 0,
  include: ['tests/integration/coachWorkoutReadback.postgres.test.mjs'],
  testTimeout: 15000, hookTimeout: 30000,
} });
