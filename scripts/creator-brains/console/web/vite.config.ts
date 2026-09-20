import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// S1 exit evidence runs: `npm run test`, `npm run typecheck`, `npm run build`.
// Budgets from 02-blueprint.md §6 are enforced at S6, not here.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // S7 library-mode note lives in 08-slices-operations.md; S1 ships an app build.
  },
  server: { port: 5173, strictPort: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
