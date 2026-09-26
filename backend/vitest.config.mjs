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
    include: ['__tests__/**/*.test.{js,mjs}', 'tests/**/*.test.{js,mjs}', 'scripts/**/seed-shadow-db.test.mjs'],
    // tests/mutation/** mutates source and spawns child vitest runs. It is
    // opt-in (`npm run test:mutation`) and must never run inside the normal
    // suite, where it would be slow and would race other readers.
    // tests/security/** are the Astra-blueprint S0 security suites: they run
    // through scripts/run-disposable-security-tests.mjs (DB-resource guard)
    // or node --test with --experimental-vm-modules, never the default run.
    exclude: ['node_modules', 'dist', 'tests/integration/**', 'tests/mutation/**', 'tests/security/**'],

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
