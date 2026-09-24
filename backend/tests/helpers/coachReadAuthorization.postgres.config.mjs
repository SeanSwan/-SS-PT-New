/** G04.2b-A: explicit owned DB1 only; no app env, shared setup, retry or parallel file. */
import { defineConfig } from 'vitest/config';
export default defineConfig({ envDir: false, test: {
  environment: 'node', setupFiles: [], fileParallelism: false, retry: 0,
  include: ['tests/integration/coachReadAuthorization.postgres.test.mjs'],
  testTimeout: 30000, hookTimeout: 30000,
} });
