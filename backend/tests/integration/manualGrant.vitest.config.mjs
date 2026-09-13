import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/sessionPackageManualGrantPostgres.test.mjs'],
    testTimeout: 60000,
    hookTimeout: 60000,
    retry: 0,
    reporters: ['verbose'],
  },
});
