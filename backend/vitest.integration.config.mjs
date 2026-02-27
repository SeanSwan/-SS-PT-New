/**
 * Vitest Configuration for Integration Tests
 * Phase 5W-C: CHECK Constraint Merge Gate
 *
 * Scoped to waiver constraint tests only.
 * Uses real PostgreSQL connection (PG_DB_TEST from config.cjs).
 * No setup file — tests are self-contained.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/waiverConstraints.test.mjs'],
    testTimeout: 60000,
    hookTimeout: 60000,
    retry: 0, // No retries — DB constraint failures are real
    reporters: ['verbose'],
  },
});
