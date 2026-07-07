/**
 * viewport-sweep.config.mjs — SwanStudios config for the portable sweep
 * =======================================================================
 * Everything app-specific lives HERE (the tool itself is dependency-free):
 * the Playwright browser comes from the frontend's node_modules, the routes
 * are SwanStudios surfaces, output lands beside the tool (gitignored class).
 *
 * PUBLIC surfaces run unauthenticated. For dashboard surfaces (Coach command
 * center, logger, client home), generate a storage state once with a real
 * login and set storageStatePath — see README step 3.
 */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Playwright resolved from the HOST app (frontend devDependencies).
const require = createRequire(resolve(__dirname, '../../frontend/package.json'));
const { chromium } = require('playwright');

export default {
  chromium,
  baseUrl: process.env.SWEEP_BASE_URL || 'http://localhost:4173',
  outputDir: resolve(__dirname, 'output'),
  screenshotFailures: true,
  touchTargetMin: 44,
  // Legal body links are prose anchors, not controls; nav chips inside
  // horizontally-scrolling carousels manage their own hit areas.
  touchTargetIgnore: ['article a', 'p a', 'li a', '[data-sweep-ignore]'],
  storageStatePath: process.env.SWEEP_STORAGE_STATE || null,
  routes: [
    { path: '/', label: 'home', readySelector: '#hero' },
    { path: '/about', label: 'about' },
    { path: '/store', label: 'store' },
    { path: '/privacy', label: 'privacy' },
    { path: '/terms', label: 'terms' },
    { path: '/login', label: 'login' },
    { path: '/signup', label: 'signup' },
  ],
};
