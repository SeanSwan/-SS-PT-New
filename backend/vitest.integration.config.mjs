/**
 * Vitest Configuration for Integration Tests
 *
 * Tests in this config use a real PostgreSQL connection and are gated
 * to skip cleanly when DATABASE_URL is unset. Each test file is
 * self-contained; no shared setup file.
 *
 * Suites included:
 *   - waiverConstraints: Phase 5W-C CHECK constraint merge gate
 *   - plaudApplaudSchemaDrift: Phase 5 Slice 5.1 schema-drift detection
 *     (Codex-required Rule 58; safe read-only introspection)
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'tests/integration/waiverConstraints.test.mjs',
      'tests/integration/plaudApplaudSchemaDrift.test.mjs',
      'tests/integration/plaudApplaudWebhookIntegration.test.mjs',
      // S06 / H02: real-PostgreSQL atomic Bootcamp template persistence. Uses its
      // own positively identified disposable fixture (127.0.0.1:55089) and
      // refuses to run when that identity cannot be verified.
      'tests/integration/bootcampTemplatePersistence.integration.test.mjs',
      // H29 / R-H04: real-PostgreSQL proof for the taught-log operation identity —
      // the unique taught-log race, preexisting-null-row compatibility, and migration
      // up/down/up. Same positively identified disposable fixture, and it refuses to
      // run when that identity cannot be verified.
      'tests/integration/rolodexServerRepair.postgres.test.mjs',
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
    retry: 0, // No retries — DB constraint failures are real
    reporters: ['verbose'],
  },
});
