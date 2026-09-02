/**
 * Vitest Configuration for Backend API Tests
 * Phase 3: Operations-Ready Test Suite
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Node environment for backend testing
    environment: 'node',

    // Global test functions (describe, it, expect)
    globals: true,

    // Test file patterns
    include: ['__tests__/**/*.test.{js,mjs}', 'tests/**/*.test.{js,mjs}'],
    // The Sheen Forge suite below is written for node:test, not vitest. Vitest loads
    // those files, finds no vitest suites, and reports "No test suite found" — which
    // put 15 perfectly green files (175 passing tests under `npm run test:node`) into
    // the failing baseline for weeks. They run under their intended runner via
    // `npm run test:node`; tests/unit/nodeTestRunnerSeparation.test.mjs guards this
    // list against drift (a new node:test file not listed here fails that guard).
    exclude: [
      'node_modules', 'dist', 'tests/integration/**',
      'tests/unit/bracket.test.mjs',
      'tests/unit/capabilityHonesty.test.mjs',
      'tests/unit/capturedFixtures.test.mjs',
      'tests/unit/contactSheet.test.mjs',
      'tests/unit/fixAfter.test.mjs',
      'tests/unit/forgeAspectContract.test.mjs',
      'tests/unit/forgeEndToEnd.test.mjs',
      'tests/unit/imageDimensions.test.mjs',
      'tests/unit/moduleSmoke.test.mjs',
      'tests/unit/pixels.test.mjs',
      'tests/unit/prune.test.mjs',
      'tests/unit/swanLawFilter.corpus.test.mjs',
      'tests/unit/swanLawFilter.test.mjs',
      'tests/unit/swanPromptCompiler.test.mjs',
      'tests/unit/variantRun.test.mjs',
      'tests/unit/winnerAndCapability.test.mjs',
    ],

    // Setup file for test environment
    setupFiles: ['./tests/setup.mjs'],

    // Timeout for async operations
    testTimeout: 30000,
    hookTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['routes/**/*.mjs', 'middleware/**/*.mjs', 'services/**/*.mjs'],
      exclude: ['node_modules', 'tests', '__tests__', 'scripts']
    },

    // Retry failed tests once
    retry: 1,

    // Reporter for CI
    reporters: ['default'],
  },
});
