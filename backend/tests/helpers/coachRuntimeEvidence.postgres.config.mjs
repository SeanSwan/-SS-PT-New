import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: false,
  test: {
    setupFiles: [],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    include: ['tests/integration/coachRuntimeEvidence.postgres.test.mjs'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
