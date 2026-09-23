#!/usr/bin/env node
/**
 * dependency-version-receipt.mjs — declared / locked / installed, side by side.
 *
 * WHY THIS EXISTS (Astra A1-06, hostile review R5, 2026-09-19)
 * ===========================================================
 * A verification receipt in the theme-lens packet stated dependency versions as though
 * there were one number per package. There are three, and they routinely differ:
 *
 *   declared   the RANGE in package.json          `^18.2.0`
 *   locked     the exact version in the lockfile   18.3.1
 *   installed  what is actually on disk            18.3.1
 *
 * Collapsing them is not a rounding error. `^18.2.0` and `18.3.1` support different
 * claims: a receipt that says "React 18.2.0" cannot honestly back an assertion about
 * behaviour introduced in 18.3.0. Astra's objection was precisely that the packet's
 * receipts conflated the two, and the review was correct — verified independently:
 *
 *   React             ^18.2.0  -> 18.3.1    framer-motion    ^10.16.5 -> 10.18.0
 *   styled-components  ^6.1.6  -> 6.1.19    three            ^0.169.0 -> 0.169.0
 *
 * Declared-vs-installed differing is NORMAL and is not a failure — that is what a range
 * means. LOCKED-vs-INSTALLED differing IS a failure: it means `node_modules` does not
 * match the lockfile, so the build that ran is not the build that was committed. That is
 * the only case this script exits non-zero on.
 *
 * Usage:
 *   node scripts/dependency-version-receipt.mjs [--package frontend] [--names react,three] [--json]
 *
 * Exit codes: 0 in agreement · 1 lockfile/installed drift · 4 usage · 6 input
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const EXIT = { OK: 0, DRIFT: 1, USAGE: 4, INPUT: 6 };

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

export function collectVersions(dir, names = null) {
  const pkg = readJson(join(dir, 'package.json'));
  if (!pkg) throw Object.assign(new Error(`no package.json in ${dir}`), { code: 'ENOENT' });

  const declared = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const lock = readJson(join(dir, 'package-lock.json'));
  const wanted = names?.length ? names : Object.keys(declared);

  return wanted.sort().map((name) => {
    // The lockfile keys nested entries as `node_modules/<name>`; a scoped package is
    // `node_modules/@scope/name`, which the same join produces.
    const locked = lock?.packages?.[`node_modules/${name}`]?.version ?? null;
    const installed = readJson(join(dir, 'node_modules', name, 'package.json'))?.version ?? null;
    return {
      name,
      declared: declared[name] ?? null,
      locked,
      installed,
      // Only this comparison is a defect. See the header.
      drift: locked !== null && installed !== null && locked !== installed,
    };
  });
}

const pad = (s, n) => String(s ?? '(absent)').padEnd(n);

export function renderTable(rows) {
  const nameWidth = Math.max(6, ...rows.map((r) => r.name.length));
  const lines = [
    `${pad('package', nameWidth)}  ${pad('declared', 12)}${pad('locked', 12)}${pad('installed', 12)}drift`,
    `${'-'.repeat(nameWidth)}  ${'-'.repeat(12)}${'-'.repeat(12)}${'-'.repeat(12)}-----`,
  ];
  for (const r of rows) {
    lines.push(
      `${pad(r.name, nameWidth)}  ${pad(r.declared, 12)}${pad(r.locked, 12)}${pad(r.installed, 12)}`
      + (r.drift ? 'YES — node_modules does not match the lockfile' : 'no'),
    );
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const raw = {};
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { json = true; continue; }
    if (!['--package', '--names'].includes(argv[i])) throw new Error(`invalid argument: ${argv[i]}`);
    const value = argv[i + 1];
    if (typeof value !== 'string' || value.startsWith('--')) throw new Error(`missing value for ${argv[i]}`);
    raw[argv[i]] = value;
    i += 1;
  }
  return {
    dir: resolve(raw['--package'] || 'frontend'),
    names: raw['--names'] ? raw['--names'].split(',').map((s) => s.trim()).filter(Boolean) : null,
    json,
  };
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`[version-receipt] ${error.message}`);
    return EXIT.USAGE;
  }

  let rows;
  try {
    rows = collectVersions(options.dir, options.names);
  } catch (error) {
    console.error(`[version-receipt] ${error.message}`);
    return EXIT.INPUT;
  }

  if (options.json) {
    console.log(JSON.stringify({ package: options.dir, rows }, null, 2));
  } else {
    console.log(renderTable(rows));
    console.log(
      '\nDeclared-vs-installed differing is a RANGE, not a defect. '
      + 'Locked-vs-installed differing is a defect.',
    );
  }
  return rows.some((r) => r.drift) ? EXIT.DRIFT : EXIT.OK;
}

const invokedDirectly = process.argv[1]?.endsWith('dependency-version-receipt.mjs');
if (invokedDirectly) {
  const code = main();
  if (code) process.exitCode = code;
}
