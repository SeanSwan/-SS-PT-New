/**
 * esmNodeLoadable.test.mjs
 * ========================
 * Guards the class of defect that vitest itself hides.
 *
 * WHY THIS EXISTS. `services/photoStorageService.mjs` referenced `__dirname` without
 * defining it. Under plain `node server.mjs` that throws
 * `ReferenceError: __dirname is not defined in ES module scope` on import, so the module
 * could never load and the application could not boot. `core/middleware/errorHandler.mjs`
 * had the same defect, where it broke the SPA fallback in production only.
 *
 * The whole test suite passed anyway, because vitest transforms modules through Vite and
 * Vite supplies a `__dirname` shim. Every test that imported those modules was green while
 * production was dead. That is the failure mode this file exists to prevent: a test that
 * runs in a more forgiving runtime than the one that ships.
 *
 * Two independent guards:
 *   1. STATIC  — any module the server loads that reads `__dirname` must also define it.
 *   2. RUNTIME — the load-bearing modules must import under real `node`, not under Vite.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BACKEND = fileURLToPath(new URL('../..', import.meta.url));

/** Directories that participate in the shipped server process. */
const RUNTIME_DIRS = ['services', 'routes', 'controllers', 'core', 'utils', 'models', 'middleware'];

/**
 * Root-level modules the server actually imports. Deliberately an explicit list rather than
 * every root-level `.mjs`: this directory also holds standalone operator scripts (seeders,
 * key comparison, one-off migrations) that are not part of the server process, and folding
 * them in makes this guard fail for reasons unrelated to what it protects.
 */
const SERVER_ENTRYPOINTS = ['server.mjs', 'database.mjs'];

/**
 * Remove comments without removing code.
 *
 * A regex cannot do this correctly. A block-comment pattern starting at the first slash-star
 * will happily pair it with the next star-slash, and when that first slash-star appears
 * inside a line comment it swallows real code between them. One file in this repo is a single
 * physical line with literal backslash-n escapes, so any line-anchored regex also treats the
 * whole file as one line. This walks the source instead, tracking string and template-literal
 * state.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  let state = 'code';
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];

    if (state === 'code') {
      if (c === '/' && d === '/') { state = 'line'; i += 2; continue; }
      if (c === '/' && d === '*') { state = 'block'; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') { state = c; out += c; i += 1; continue; }
      out += c; i += 1; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c; }
      i += 1; continue;
    }
    if (state === 'block') {
      if (c === '*' && d === '/') { state = 'code'; i += 2; continue; }
      if (c === '\n') out += c; // keep line structure so offsets stay comparable
      i += 1; continue;
    }
    // inside a string / template literal
    if (c === '\\') { out += c + (d ?? ''); i += 2; continue; }
    if (c === state) { state = 'code'; out += c; i += 1; continue; }
    out += c; i += 1;
  }
  return out;
}

/** Collect every `.mjs` the server process loads, skipping node_modules. */
function collectRuntimeModules() {
  const found = [];
  for (const name of SERVER_ENTRYPOINTS) {
    const file = join(BACKEND, name);
    if (existsSync(file)) found.push(file);
  }
  for (const dir of RUNTIME_DIRS) {
    const root = join(BACKEND, dir);
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
      found.push(join(entry.parentPath ?? entry.path, entry.name));
    }
  }
  return found;
}

/** Modules that must load under plain node for the server to boot. */
const LOAD_BEARING = [
  'services/photoStorageService.mjs',
  'services/spotlightImageFetch.mjs',
  'services/swanBridgeSignature.mjs',
  'routes/bridge/bridgeIngestRoutes.mjs',
];

describe('ESM runtime guards', () => {
  it('every runtime .mjs that reads __dirname also defines it', () => {
    const offenders = [];
    for (const file of collectRuntimeModules()) {
      const code = stripComments(readFileSync(file, 'utf8'));
      if (!/\b__dirname\b/.test(code)) continue;
      const definesIt = /(?:^|[^\w$])(const|let|var)\s+__dirname\b/.test(code)
        || /globalThis\.__dirname\s*=/.test(code);
      if (!definesIt) offenders.push(relative(BACKEND, file));
    }
    // The message names the files, so a failure is actionable without re-running the scan.
    expect(offenders, `these files read __dirname in ESM without defining it: ${offenders.join(', ')}`)
      .toEqual([]);
  });

  it.each(LOAD_BEARING)('%s imports under plain node (not just under Vite)', (relativePath) => {
    const absolute = join(BACKEND, relativePath);
    expect(existsSync(absolute), `missing module: ${relativePath}`).toBe(true);

    const probe = [
      `const url = ${JSON.stringify(pathToFileURL(absolute).href)};`,
      'try {',
      '  await import(url);',
      "  console.log('LOADED');",
      '} catch (err) {',
      "  console.log('FAILED:' + err.constructor.name + ':' + String(err.message).split('\\n')[0]);",
      '  process.exit(1);',
      '}',
    ].join('\n');

    let stdout = '';
    let failed = false;
    try {
      // Plain `node`, no Vite, no loaders — the same runtime the deployed process uses.
      stdout = execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
        cwd: BACKEND,
        encoding: 'utf8',
        timeout: 120_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      failed = true;
      stdout = `${err.stdout || ''}${err.stderr || ''}`;
    }

    expect(failed, `${relativePath} failed to import under plain node:\n${stdout}`).toBe(false);
    expect(stdout).toContain('LOADED');
  }, 150_000);
});
