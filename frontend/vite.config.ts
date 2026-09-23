import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { injectCspMeta } from './src/config/contentSecurityPolicy';

/**
 * SWA-104 — inject the Content-Security-Policy into the built HTML document.
 *
 * sswanstudios.com is a Render STATIC SITE that is not Blueprint-synced, so the
 * `headers:` block in render.yaml never reaches visitors and helmet's CSP only
 * ever covered /api/*. A <meta http-equiv> tag ships inside the build artifact,
 * so it survives any hosting misconfiguration.
 *
 * `apply: 'build'` keeps it out of `npm run dev` on purpose: the policy includes
 * upgrade-insecure-requests, which would rewrite the dev proxy's
 * http://localhost:10000 API calls to https:// and break local development.
 *
 * Placement matters twice over — a meta CSP only governs what the parser sees
 * AFTER it, but <meta charset> must stay inside the document's first 1024 bytes.
 * injectCspMeta() anchors the policy immediately after charset to satisfy both,
 * and throws if that anchor is ever removed rather than silently shipping nothing.
 */
const productionCspMeta = () => ({
  name: 'swan-production-csp-meta',
  apply: 'build' as const,
  transformIndexHtml: {
    order: 'pre' as const,
    handler: (html: string) => injectCspMeta(html),
  },
});

export default defineConfig({
  // Ensure public folder files (including _redirects) are copied to dist
  publicDir: 'public',
  plugins: [
    react(),
    productionCspMeta()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    fs: {
      allow: [path.resolve(__dirname), path.resolve(__dirname, '../shared/bootcamp-core')],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle and dedupe these packages
    include: ['styled-components', 'react', 'react-dom'],
    // Ensure single instance in both dev and production
    force: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    // Ensure case-sensitive file resolution matches Linux/Render environment
    preserveSymlinks: false,
    // Dedupe styled-components to prevent "we.div is not a function" error in production
    // This ensures only one instance of styled-components exists in the bundle.
    //
    // 'zod' joined for a different reason, same mechanism (SWA-225 EX-5): the
    // shared @swan/schemas package is a `file:` dependency, so with
    // preserveSymlinks:false above, Vite resolves it to its REAL path under
    // packages/ and then looks for `zod` by walking up from there — never
    // reaching frontend/node_modules. Deduping pins zod to this project's copy
    // regardless of which file imported it. Without this the shared schema
    // resolves locally only because someone once ran `npm install` inside the
    // package, and fails on any clean `npm ci` — which is exactly how it failed
    // in CI while passing on the machine that wrote it.
    dedupe: ['styled-components', 'react', 'react-dom', 'zod'],
    alias: {
      // Force all imports to use the same styled-components instance
      'styled-components': 'styled-components',
      '@': path.resolve(__dirname, './src'),
      // Pin zod to THIS project's copy (SWA-225 EX-5). The shared @swan/schemas
      // package is a `file:` dependency: npm symlinks it but does not install
      // its dependencies, and with preserveSymlinks:false above, Vite resolves
      // the package to its real path under packages/ and then hunts for `zod` by
      // walking up from there — never reaching frontend/node_modules. dedupe
      // cannot help; it chooses BETWEEN copies rather than finding one.
      // An alias is the surgical fix and leaves the deliberate
      // preserveSymlinks:false (Linux case-sensitivity parity) untouched.
      zod: path.resolve(__dirname, './node_modules/zod'),
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Do not publish production source maps; upload private maps to an error tracker when configured
    minify: 'esbuild', // Re-enabled minification for production
    chunkSizeWarningLimit: 1200,
    // Force new file paths to bypass Cloudflare CDN cache
    // Changed from /assets/ to /v3/ to force cache miss
    rollupOptions: {
      output: {
        entryFileNames: 'v3/[name].[hash].js',
        chunkFileNames: 'v3/[name].[hash].js',
        assetFileNames: 'v3/[name].[hash].[ext]',
        // Performance: Split vendor bundles for better caching
        manualChunks: {
          // React core - rarely changes, cache aggressively
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Styled components - separate chunk prevents duplication
          'styled-components': ['styled-components'],
          // Animation libraries - used across many components
          'animation-vendor': ['framer-motion'],
          // Data fetching - used everywhere
          'query-vendor': ['@tanstack/react-query'],
          // Redux state management
          'redux-vendor': ['react-redux', '@reduxjs/toolkit'],
          // Date utilities
          'date-vendor': ['date-fns'],
          // Icons - lazy load separately
          'icons-vendor': ['lucide-react'],
        }
      }
      // REMOVED incorrect 'external' configuration that was breaking V2 imports
      // V2 files ARE part of our bundle and should NOT be marked as external
      // Legacy/backup files are already excluded via tsconfig.json
    }
  }
});
