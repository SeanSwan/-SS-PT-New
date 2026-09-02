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
    // tests/node-runner/** are node:test-dialect files (import test from 'node:test').
    // Vitest collects them and reports "No test suite found" — 16 of the 23 red
    // files on main were exactly this: healthy tests in the wrong runner (SWA-231).
    // They run in CI via `node --test tests/node-runner/*.test.mjs` (glob form —
    // a bare directory arg is treated as a module path and fails).
    exclude: ['node_modules', 'dist', 'tests/integration/**', 'tests/node-runner/**'],

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
