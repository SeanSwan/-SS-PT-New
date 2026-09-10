/** Opt-in disposable DB suite; no application setup or .env imports. */
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/coachWorkoutAtomic.postgres.test.mjs'],
    setupFiles: [], fileParallelism: false, retry: 0,
    testTimeout: 30000, hookTimeout: 30000,
  },
});
