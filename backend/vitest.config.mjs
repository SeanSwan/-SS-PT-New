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
    // ── node:test runner files, NOT vitest ─────────────────────────────────
    // These use Node's built-in test runner (`import test from 'node:test'`).
    // Vitest scans them, finds no suite it recognises, and reports "No test
    // suite found" as a FAILURE — which is why `npm test` looked permanently
    // red on a clean checkout: 16 green files (175 passing tests) booked as
    // sickness. Independently diagnosed twice (S4a on 2026-08-21, stranded
    // unmerged; re-derived 2026-09-02 — the cost of an unlanded fix).
    //
    // They are NOT skipped: `npm run test:node` runs them under their intended
    // runner, and CI runs both. This is an explicit list, never a glob, so a
    // NEW node:test file fails loudly in tests/unit/nodeTestRunnerSeparation
    // .test.mjs (three-way lock: detected set == this list == test:node args).
    // Known-red VITEST files are deliberately NOT here — they stay visible in
    // the suite and recorded in tests/known-failing-baseline.json with
    // classifications; an exclude list must never become a hiding place.
    // Burn-down of those 7 baselined files is tracked: SWA-142 (idorAuditReader
    // Controls is security-adjacent — highest priority of the seven).
    exclude: [
      'node_modules', 'dist', 'tests/integration/**',
'tests/unit/bracket.test.mjs',
      'tests/unit/capabilityHonesty.test.mjs',
      'tests/unit/capturedFixtures.test.mjs',
      'tests/unit/contactSheet.test.mjs',
      'tests/unit/coachContextEvidence.test.mjs',
      'tests/unit/coachIntentModel.contract.test.mjs',
      'tests/unit/coachIntentReceipt.test.mjs',
      'tests/unit/coachIntentService.test.mjs',
      'tests/unit/coachIntentTransactionHook.test.mjs',
      'tests/unit/coachModelResponseContract.test.mjs',
      'tests/unit/coachProgressEvidence.test.mjs',
      'tests/unit/coachProviderBoundary.test.mjs',
      'tests/unit/coachWorkoutResultVerifier.test.mjs',
      'tests/unit/coachWorkoutReadbackService.test.mjs',
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
