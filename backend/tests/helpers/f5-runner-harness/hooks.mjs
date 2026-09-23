/**
 * F5 harness — module resolution hooks.
 *
 * Redirects exactly two specifiers for the duration of a harness run:
 *   'sequelize'      -> ./stubs/sequelize.mjs
 *   'child_process'  -> ./stubs/child_process.mjs
 *
 * Redirecting a BUILTIN is the part worth stating explicitly, because it is not
 * obvious: Node's ESM resolve hook may return a non-`node:` URL for a builtin
 * specifier and the loader will honour it. Verified 2026-09-20 against
 * node 22.22.2 before this harness was written — if it ever stops working, the
 * failure is loud (safe-migrate.mjs would reach a real database).
 *
 * Nothing else is intercepted. `fs`, `path` and `url` stay real, so
 * `getAllMigrationFiles()` still walks the real migrations directory.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

const REDIRECTS = new Map([
  ['sequelize', pathToFileURL(path.join(here, 'stubs', 'sequelize.mjs')).href],
  ['child_process', pathToFileURL(path.join(here, 'stubs', 'child_process.mjs')).href],
  ['node:child_process', pathToFileURL(path.join(here, 'stubs', 'child_process.mjs')).href],
]);

export async function resolve(specifier, context, nextResolve) {
  const redirect = REDIRECTS.get(specifier);
  if (redirect) return { url: redirect, shortCircuit: true };
  return nextResolve(specifier, context);
}
