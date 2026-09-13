import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '../../../backend/node_modules/vitest/dist/config.js';

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(evidenceDir, '../../../backend');

export default defineConfig({
  root: backendDir,
  test: {
    environment: 'node',
    globals: false,
    include: [
      '../tmp/rolodex-audit-evidence/server-red/*.red.test.mjs',
      '../tmp/rolodex-audit-evidence/server-red/*.red.integration.test.mjs',
    ],
    exclude: ['**/node_modules/**'],
    setupFiles: [],
    retry: 0,
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
  },
});
