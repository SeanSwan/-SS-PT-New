import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirror the '@' alias from vite.config.ts so tests resolve
      // '@/utils/logger' etc. the same way production builds do.
      '@': path.resolve(__dirname, './src'),
      // Mirror the zod alias too (SWA-225 EX-5). This file does NOT extend
      // vite.config.ts — it re-declares resolve.alias — so an alias added there
      // is invisible here. The shared @swan/schemas package is symlinked by a
      // `file:` dep whose own dependencies npm never installs, so without this
      // every test importing the shared schema fails to resolve `zod`.
      zod: path.resolve(__dirname, './node_modules/zod'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['**/*.e2e.test.tsx', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
});
