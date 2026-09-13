import { defineConfig } from '../../../frontend/node_modules/vitest/dist/config.js';
import path from 'node:path';

const evidenceDir = __dirname;
const frontendDir = path.resolve(evidenceDir, '../../../frontend');

export default defineConfig({
  root: frontendDir,
  resolve: {
    alias: {
      '@': path.resolve(frontendDir, 'src'),
      zod: path.resolve(frontendDir, 'node_modules/zod'),
      vitest: path.resolve(frontendDir, 'node_modules/vitest'),
      react: path.resolve(frontendDir, 'node_modules/react'),
      'react-dom': path.resolve(frontendDir, 'node_modules/react-dom'),
      '@testing-library/react': path.resolve(frontendDir, 'node_modules/@testing-library/react'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(evidenceDir, 'setup.ts')],
    include: ['../tmp/rolodex-audit-evidence/red/*.red.test.{ts,tsx}'],
    exclude: ['**/node_modules/**'],
    reporters: ['verbose'],
  },
  server: {
    fs: {
      allow: [frontendDir, evidenceDir],
    },
  },
});
