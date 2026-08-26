/**
 * ownershipFixture.mjs
 * ====================
 * Shared vocabulary for the Swan Coach ownership contracts: who the actors are, which
 * commands form the ownership surface, and which schemas a probe cannot satisfy.
 *
 * Extracted so the client-ownership and trainer-scope contracts describe the SAME world.
 * Two suites with their own idea of which commands resolve a client reference will drift,
 * and the drift shows up as one suite quietly testing fewer commands than it claims.
 */
import fs from 'fs';
import path from 'path';

import { initializeRegistry, getAllCommands } from '../../services/ai/commandRegistry/index.mjs';
import { paramNames } from './schemaShape.mjs';
import sliceBetween from './sliceBetween.mjs';

export const OUR_TRAINER = 500;
export const PEER_TRAINER = 600;
export const OWN_CLIENT = 101;
export const FOREIGN_CLIENT = 202;

/** Two clients, each assigned to a different trainer. Nothing is assigned to both. */
export const DIRECTORY = {
  clients: [
    { id: OWN_CLIENT, firstName: 'Ada', lastName: 'Own' },
    { id: FOREIGN_CLIENT, firstName: 'Bo', lastName: 'Foreign' },
  ],
  assignments: [
    { clientId: OWN_CLIENT, trainerId: OUR_TRAINER, status: 'active' },
    { clientId: FOREIGN_CLIENT, trainerId: PEER_TRAINER, status: 'active' },
  ],
};

/**
 * Commands whose schema resists synthesis (cross-field `custom` refinements), so a probe
 * cannot get past validation to reach an ownership gate. Named rather than absorbed: a
 * denial at validation is not evidence about ownership. Mirrors the pin list in the
 * authorization contract; each suite asserts its pins still fail to converge.
 */
export const UNSYNTHESIZABLE = new Set([
  'update_client', 'rest_adjust', 'create_goal', 'update_goal_progress', 'log_my_nutrition',
]);

export function allCommands() {
  initializeRegistry();
  const all = getAllCommands();
  return Array.isArray(all) ? all : Object.values(all);
}

/** Commands that resolve a caller-supplied client reference — the client-ownership surface. */
export function clientRefCommands() {
  return allCommands().filter((c) => c.requiresClientRef === true && c.selfService !== true);
}

/** Commands that accept a trainer id as a parameter — the trainer-scope surface. */
export function trainerIdCommands() {
  return allCommands().filter((c) => paramNames(c).includes('trainerId'));
}

const DISPATCHER_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..', '..', 'services', 'ai', 'dispatchers',
);

/**
 * Source of the module that DEFINES a handler, found by its export site rather than by
 * guessing a filename. Returns null when no module exports it, which a caller must treat
 * as a failure to look rather than as an absence of the thing looked for.
 */
export function handlerModuleSource(handler) {
  const pattern = new RegExp(`export\\s+(?:const|function|async function)\\s+${handler}\\b`);
  for (const entry of fs.readdirSync(DISPATCHER_DIR)) {
    if (!entry.endsWith('.mjs')) continue;
    const full = path.join(DISPATCHER_DIR, entry);
    const code = fs.readFileSync(full, 'utf8');
    if (pattern.test(code)) return { file: entry, code };
  }
  return null;
}

/**
 * The source of ONE handler, from its own export site to the next export.
 *
 * Handlers are declared three ways in this tree — `export const x =`,
 * `export function x(`, `export async function x(` — and a scan that knows only the
 * first throws on the others, which is how a coverage gap arrives disguised as a broken
 * anchor. Uses `sliceBetween` so a drifted anchor is loud rather than a window that
 * silently widens into the neighbouring handler and borrows its guard.
 *
 * @returns {{ file: string, body: string }|null} null when no module exports the handler.
 */
export function handlerBody(handler) {
  const module = handlerModuleSource(handler);
  if (!module) return null;
  const forms = [
    `export const ${handler} =`,
    `export async function ${handler}(`,
    `export function ${handler}(`,
  ];
  const start = forms.find((form) => module.code.includes(form));
  if (!start) return null;
  // The LAST export in a module has no following one. Slicing to EOF is correct there and
  // is stated rather than assumed: `sliceBetween` treats a missing end anchor as a bug
  // precisely because it usually is, so the exception has to be deliberate.
  const startIdx = module.code.indexOf(start);
  const hasNextExport = module.code.indexOf('\nexport ', startIdx + start.length) !== -1;
  return {
    file: module.file,
    isLastExport: !hasNextExport,
    body: sliceBetween(
      module.code,
      start,
      hasNextExport ? '\nexport ' : undefined,
      { label: `${module.file}:${handler}` },
    ),
  };
}
