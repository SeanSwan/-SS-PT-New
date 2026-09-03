/**
 * dispatcherReachability.mjs
 * ==========================
 * Source scanners that answer "what code can reach a Swan Coach dispatcher, and which
 * roles can a caller hold?" — shared by the authorization and confirm-lane contracts.
 *
 * Extracted from `tests/api/aiCommandDispatcherAuthorization.contract.test.mjs` when it
 * passed 600 lines (Rule 4). The scanners are the part the NEXT slice reuses: a
 * dispatcher self-gating census needs the same handler list and the same file walk.
 *
 * Every function here reads source rather than importing it, so the results describe the
 * code as written rather than as a module graph resolves it. That is the point — a
 * reachability claim built from imports would miss what a scanner can see.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sliceBetween from './sliceBetween.mjs';
import { stripComments } from './sourceScan.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND = path.resolve(HERE, '..', '..');
export const DISPATCHER_FILE = path.join(BACKEND, 'services', 'ai', 'commandDispatcher.mjs');
export const EXECUTOR_FILE = path.join(BACKEND, 'services', 'ai', 'commandExecutor.mjs');
export const DESTRUCTIVE_OPS_FILE = path.join(BACKEND, 'services', 'ai', 'destructiveOperations.mjs');
export const DISPATCHER_REL = 'services/ai/commandDispatcher.mjs';
const USER_MODEL_FILE = path.join(BACKEND, 'models', 'User.mjs');

/**
 * The roles a caller can actually hold, read from the User model's own ENUM rather
 * than from a hand-maintained list.
 *
 * WHY NOT `USER_ROLES` from the command registry: it declares ['admin','trainer','client']
 * and omits 'user' — which is the model's DEFAULT role, so it is the role most callers
 * hold. Importing it made the first run of this suite skip an entire role dimension,
 * and 12 commands legitimately gate on it (`my_progress`, `log_my_nutrition`,
 * `request_plan_adjustment`, ...). That constant has no runtime consumer, so the drift
 * was never load-bearing in production — only in a test that trusted it. Reading the
 * enum means a fifth role cannot silently escape this contract.
 */
export function callerRoles() {
  const code = stripComments(fs.readFileSync(USER_MODEL_FILE, 'utf8'));
  const window = sliceBetween(code, '    role: {', '    },', { label: 'User.role field' });
  const enumCall = window.match(/DataTypes\.ENUM\(([^)]*)\)/);
  if (!enumCall) throw new Error('User.role is no longer a DataTypes.ENUM — update this contract');
  const roles = [...enumCall[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (roles.length < 2) throw new Error('User.role enum parsed to fewer than two roles');
  return roles;
}

// ── source helpers ───────────────────────────────────────────────────────────
// A named-import extractor is written here rather than reused because sourceScan's
// `importBindings` reads DEFAULT imports and `aliasBindings` maps locals to canonical
// role-gate names — neither returns the named specifiers of an arbitrary module.
// Line accumulation, not a regex: multi-line specifier lists are the norm in this file.
export function namedImportsOf(code) {
  const out = [];
  let buf = null;
  for (const raw of code.split('\n')) {
    const line = raw.trim();
    if (buf === null) {
      if (!line.startsWith('import ')) continue;
      buf = line;
    } else {
      buf += ' ' + line;
    }
    if (buf.includes(' from ') || buf.endsWith(';')) {
      const open = buf.indexOf('{');
      const close = buf.indexOf('}');
      if (open !== -1 && close > open) {
        for (const piece of buf.slice(open + 1, close).split(',')) {
          const parts = piece.trim().split(' as ');
          const local = parts[parts.length - 1].trim();
          if (local) out.push(local);
        }
      }
      buf = null;
    }
  }
  return out;
}

/** Command type -> handler identifier, read from the real DISPATCHERS map. */
export function readDispatcherMap() {
  const code = stripComments(fs.readFileSync(DISPATCHER_FILE, 'utf8'));
  const window = sliceBetween(code, 'const DISPATCHERS = new Map([', '\n]);', {
    label: 'DISPATCHERS map',
  });
  const entries = [...window.matchAll(/\[\s*'([^']+)'\s*,\s*([A-Za-z0-9_$]+)\s*\]/g)]
    .map((m) => ({ type: m[1], handler: m[2] }));
  return entries;
}

export function walkBackendSources() {
  // scripts/seeders/migrations included deliberately: they are not HTTP-reachable, but
  // they run with full DB credentials and no pipeline, so a handler imported there is a
  // door too — just one an operator opens rather than a request.
  const roots = ['routes', 'controllers', 'services', 'middleware', 'jobs', 'utils', 'scripts', 'seeders', 'migrations'];
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mjs|js|cjs)$/.test(entry.name)) files.push(full);
    }
  };
  roots.forEach((r) => walk(path.join(BACKEND, r)));
  return files;
}

export const rel = (abs) => path.relative(BACKEND, abs).split(path.sep).join('/');
