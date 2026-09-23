// esbuild lives in frontend/node_modules; resolve it from there rather than
// requiring a package.json in this evidence folder.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const { build } = require('esbuild');

await build({
  entryPoints: [path.join(here, 'entry.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  loader: { '.json': 'json' },
  outfile: path.join(here, 'bundle.js'),
  logLevel: 'info',
  absWorkingDir: path.join(root, 'frontend'),
  nodePaths: [path.join(root, 'frontend', 'node_modules')],
});

// The blit experiment: GL canvas off-DOM at k*N, blitted into a 2D canvas at N.
await build({
  entryPoints: [path.join(here, 'blit-entry.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  loader: { '.json': 'json' },
  outfile: path.join(here, 'blit-bundle.js'),
  logLevel: 'info',
  absWorkingDir: path.join(root, 'frontend'),
  nodePaths: [path.join(root, 'frontend', 'node_modules')],
});

// Integration harness: the real header Logo component.
await build({
  entryPoints: [path.join(here, 'logo-entry.tsx')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  jsx: 'automatic',
  loader: { '.json': 'json', '.png': 'file' },
  outdir: here,
  entryNames: 'logo-bundle',
  assetNames: 'component-assets/[name]-[hash]',
  define: {
    'process.env.NODE_ENV': '"development"',
    'import.meta.env.DEV': 'true',
  },
  logLevel: 'info',
  absWorkingDir: path.join(root, 'frontend'),
  nodePaths: [path.join(root, 'frontend', 'node_modules')],
});

// The React harness. Built separately because it needs the JSX transform, a PNG
// loader for the component's fallback import, and React/styled-components in the
// bundle. `import.meta.env.DEV` is replaced with a literal because esbuild has no
// Vite env; without it the component's dev-only warning path would throw.
await build({
  entryPoints: [path.join(here, 'component-entry.tsx')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  jsx: 'automatic',
  loader: { '.json': 'json', '.png': 'file' },
  outdir: here,
  entryNames: 'component-bundle',
  assetNames: 'component-assets/[name]-[hash]',
  define: {
    'process.env.NODE_ENV': '"development"',
    'import.meta.env.DEV': 'true',
  },
  logLevel: 'info',
  absWorkingDir: path.join(root, 'frontend'),
  nodePaths: [path.join(root, 'frontend', 'node_modules')],
});
