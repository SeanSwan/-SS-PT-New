/**
 * FILE: modelRegistryAudit.mjs
 * PURPOSE: Statically diff the model ENUMERATION (files on disk, getModel call
 * sites) against the model REGISTRY (what associations.mjs actually returns).
 * OWNER: SwanStudios QA.
 *
 * WHY THIS EXISTS — the failure it was written against:
 *
 *   `RenewalAlert` was never registered in associations.mjs. `getModel()` THROWS
 *   on an unknown key, and renewalAlertService.mjs calls
 *   `getModel('RenewalAlert')`. So every renewal-alert path threw at runtime:
 *   `/api/renewal-alerts` (mounted at core/routes.mjs) returned 500, and the
 *   automation cron swallowed the throw into a log line and carried on. The
 *   churn-risk feature looked fully wired — model file, migration, service,
 *   controller, routes, cron — and could not work. Nothing failed loudly.
 *
 * This module is deliberately STATIC. A boot-time check needs a live Sequelize
 * connection and can only run where the DB is reachable; a static one runs in
 * CI on every commit, costs milliseconds, and catches the same class before it
 * ever reaches a boot. (Wiring an additional assertion into production boot is
 * a separate, Sean-gated step.)
 *
 * FAIL-LOUD CONTRACT: every parse below throws rather than returning an empty
 * set. An empty registry would make every drift assertion vacuously true — the
 * exact green-on-nothing failure this file exists to prevent.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(here, '..');
const MODELS_DIR = path.join(BACKEND_ROOT, 'models');
const ASSOCIATIONS = path.join(MODELS_DIR, 'associations.mjs');

/** Directories whose modules may legitimately consume models. Tests excluded. */
const CALLER_DIRS = ['routes', 'controllers', 'services', 'jobs', 'middleware', 'utils', 'core'];

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, acc);
    else if (/\.(mjs|js)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const isTestFile = (file) => /\.test\.|\.spec\.|[\\/]__tests__[\\/]|[\\/]tests[\\/]/.test(file);

/**
 * Blank out block and line comments so documentation that QUOTES a call is not
 * mistaken for the call. Replaces with spaces rather than deleting, so any
 * offsets a future caller derives stay meaningful.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (line, lead) => lead + ' '.repeat(line.length - lead.length));
}

/**
 * Model names the registry actually exposes — parsed from the object
 * associations.mjs returns.
 *
 * Parses EVERY identifier in the block, not one per line: the real file packs
 * several keys onto a single line (`BootcampTemplate, BootcampStation, ...`),
 * and a one-per-line regex silently under-reports, which manufactures false
 * "unregistered" findings.
 */
export function readRegisteredModels(source = ASSOCIATIONS) {
  const text = readFileSync(source, 'utf8');

  const at = text.lastIndexOf('return {');
  if (at === -1) {
    throw new Error(
      `modelRegistryAudit: no "return {" in ${source}. The registry moved or was restructured — `
      + 'fix this parser rather than letting the drift check silently stop working.',
    );
  }

  // Match the closing brace at ANY indentation, and never fall back to a
  // slice(at, -1): that reads to end-of-file instead of failing, which is how a
  // throwaway version of this parser produced confident nonsense.
  const rest = text.slice(at);
  const close = /^[ \t]*\};/m.exec(rest);
  if (!close) throw new Error(`modelRegistryAudit: unterminated registry object in ${source}`);

  const block = rest.slice('return {'.length, close.index);
  const names = new Set(
    [...block.matchAll(/([A-Za-z_$][\w$]*)\s*(?=[,:}\n])/g)]
      .map((match) => match[1])
      .filter((name) => /^[A-Z]/.test(name)),
  );

  if (names.size === 0) {
    throw new Error('modelRegistryAudit: parsed ZERO registered models. Refusing an empty registry.');
  }
  return names;
}

/**
 * The name a model file DECLARES, falling back to its basename.
 *
 * Filename and model name are not the same thing: `models/contact.mjs` declares
 * `modelName: "Contact"` and is registered under that name. Keying the
 * enumeration off the filename reported it as unregistered — a finding invented
 * by the instrument rather than found in the code.
 */
function declaredModelName(file) {
  const text = readFileSync(file, 'utf8');
  const declared = /modelName:\s*['"]([A-Za-z_$][\w$]*)['"]/.exec(text)
    || /sequelize\.define\(\s*['"]([A-Za-z_$][\w$]*)['"]/.exec(text);
  return declared ? declared[1] : path.basename(file, '.mjs');
}

/** Model files on disk that actually define a Sequelize model. */
export function readModelFiles(dir = MODELS_DIR) {
  const defines = /sequelize\.define\s*\(|extends\s+Model\b|\.init\s*\(\s*\{/;

  const files = walk(dir).filter((file) => {
    const base = path.basename(file);
    if (base === 'index.mjs' || base === 'associations.mjs') return false;
    if (isTestFile(file)) return false;
    return defines.test(readFileSync(file, 'utf8'));
  });

  if (files.length === 0) {
    throw new Error('modelRegistryAudit: found ZERO model files. Refusing an empty enumeration.');
  }

  return files.map((file) => ({
    name: declaredModelName(file),
    file: path.relative(BACKEND_ROOT, file).split(path.sep).join('/'),
  }));
}

/**
 * Every `getModel('X')` call site outside models/ and tests.
 *
 * This is the highest-severity input: getModel THROWS on an unknown key, so a
 * call site naming an unregistered model is a guaranteed runtime failure on
 * whatever path reaches it — not a style issue.
 */
export function readGetModelCallSites(root = BACKEND_ROOT) {
  const sites = [];
  const selfPath = fileURLToPath(import.meta.url);

  for (const dirName of CALLER_DIRS) {
    for (const file of walk(path.join(root, dirName))) {
      if (isTestFile(file)) continue;
      // This module documents the RenewalAlert failure by quoting the call, so
      // scanning itself reports a call site that does not exist. A scanner that
      // matches its own prose manufactures findings.
      if (path.resolve(file) === selfPath) continue;

      const text = stripComments(readFileSync(file, 'utf8'));
      for (const match of text.matchAll(/getModel\(\s*['"]([A-Za-z_$][\w$]*)['"]\s*\)/g)) {
        sites.push({
          model: match[1],
          file: path.relative(root, file).split(path.sep).join('/'),
        });
      }
    }
  }
  return sites;
}
