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
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
    retry: 0, // No retries — DB constraint failures are real
    reporters: ['verbose'],
  },
});
