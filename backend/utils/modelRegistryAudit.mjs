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
  // Comments MUST be stripped here, not only in the call-site scanner (external
  // review, Kimi K3, 2026-08-14). A line like
  //   // TODO: register PaymentPlan, DisputeBatch next sprint
  // inside the returned object seeded both names into the "registered" set, so a
  // `getModel('PaymentPlan')` call site passed the highest-severity assertion
  // while the model was unregistered — the exact RenewalAlert failure, green.
  const text = stripComments(readFileSync(source, 'utf8'));

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
function declaredModelNames(file) {
  const text = stripComments(readFileSync(file, 'utf8'));

  // ALL declarations, not the first (Kimi K3, 2026-08-14): one file defining two
  // models yielded a single entry, so if the second were unregistered and
  // unacknowledged the enumeration under-counted by construction and the
  // "registered or dormant" assertion passed over it.
  const names = new Set([
    ...[...text.matchAll(/modelName:\s*['"`]([A-Za-z_$][\w$]*)['"`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/sequelize\.define\(\s*['"`]([A-Za-z_$][\w$]*)['"`]/g)].map((m) => m[1]),
  ]);

  return names.size > 0 ? [...names] : [path.basename(file, '.mjs')];
}

/**
 * Registry entries that are NOT plain shorthand, plus any name with no visible
 * binding in the file.
 *
 * WHY (external review, HY3, 2026-08-14): `readRegisteredModels` proves a NAME
 * appears in the returned object. It cannot prove the name is bound to the right
 * VALUE. Someone writing `RenewalAlert: Notification` — or keeping the key while
 * deleting the `await import(...)` — passes the name check and still throws at
 * runtime, which is the exact failure the tripwire exists to catch.
 *
 * The registry is 100% shorthand today (159 entries plus 3 conditional spreads),
 * so key === value by construction. Nothing ENFORCED that. This does: anything
 * other than shorthand or a recognised conditional spread is reported for human
 * review rather than silently trusted.
 *
 * A name may be bound by `const X =`, by destructuring (`const { X, Y } = ...`),
 * or by a conditional spread. All three are real and in use.
 */
export function readRegistryBindingProblems(source = ASSOCIATIONS) {
  // Block comments too — a per-line `//` strip does not remove a `/* ... */`
  // spanning the registry object.
  const text = stripComments(readFileSync(source, 'utf8'));
  const at = text.lastIndexOf('return {');
  if (at === -1) throw new Error(`modelRegistryAudit: no "return {" in ${source}`);

  const rest = text.slice(at);
  const close = /^[ \t]*\};/m.exec(rest);
  if (!close) throw new Error(`modelRegistryAudit: unterminated registry object in ${source}`);

  const block = rest.slice('return {'.length, close.index);
  const problems = [];
  const names = [];

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.replace(/\/\/.*$/, '').trim();
    if (!line) continue;

    // `...(X ? { X } : {})` — an intentional conditional entry, key === value.
    if (/^\.\.\.\(/.test(line)) {
      const spread = /\{\s*([A-Za-z_$][\w$]*)\s*\}/.exec(line);
      if (spread) names.push(spread[1]);
      else problems.push(`unrecognised conditional spread: ${line}`);
      continue;
    }

    for (const part of line.split(',')) {
      const entry = part.trim();
      if (!entry) continue;
      if (/^[A-Za-z_$][\w$]*$/.test(entry)) {
        names.push(entry);
      } else if (/^([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)$/.test(entry)) {
        // Key:value is where a mis-binding hides. Never silently accepted.
        problems.push(`non-shorthand entry "${entry}" — key and value can disagree; use shorthand`);
      } else {
        problems.push(`unparsed registry entry: ${entry}`);
      }
    }
  }

  const bound = (name) => (
    new RegExp(`\\bconst\\s+${name}\\s*=`).test(text)
    || new RegExp(`\\bconst\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*=`).test(text)
  );

  for (const name of names) {
    if (!bound(name)) problems.push(`"${name}" is returned but never bound in ${path.basename(source)}`);
  }

  return problems;
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

  return files.flatMap((file) => {
    const relative = path.relative(BACKEND_ROOT, file).split(path.sep).join('/');
    return declaredModelNames(file).map((name) => ({ name, file: relative }));
  });
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
      // Backticks included: a refactor to template literals would otherwise turn a
      // guaranteed-throw call site into one this scanner never sees, so the
      // assertion passes while production 500s (Kimi K3, 2026-08-14).
      for (const match of text.matchAll(/getModel\(\s*['"`]([A-Za-z_$][\w$]*)['"`]\s*\)/g)) {
        sites.push({
          model: match[1],
          file: path.relative(root, file).split(path.sep).join('/'),
        });
      }
    }
  }
  return sites;
}
