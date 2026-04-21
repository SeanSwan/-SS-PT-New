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
