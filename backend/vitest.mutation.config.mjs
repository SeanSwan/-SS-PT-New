/**
 * Vitest configuration for the mutation harness only.
 *
 * Run with: npm run test:mutation
 *
 * Deliberately separate from vitest.config.mjs:
 *   - it includes ONLY tests/mutation/**, which the main config excludes;
 *   - fileParallelism is off, so the child vitest runs cannot interleave with
 *     each other and observe a half-written throwaway tree;
 *   - retry is 0. A mutation test that passes on the second attempt has told
 *     you nothing — the whole question is whether the guard fails.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/mutation/**/*.test.{js,mjs}'],
    fileParallelism: false,
    retry: 0,
    testTimeout: 300_000,
    hookTimeout: 300_000,
    reporters: ['default'],
  },
});
