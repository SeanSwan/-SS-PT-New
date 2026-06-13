import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Session status enum drift guard (rule 58).
 * ============================================================================
 * conflictService.mjs (ACTIVE_STATUSES) filters sessions on statuses including
 * 'assigned', and TrainerAssignmentService.mjs writes status: 'assigned'. Every
 * such status MUST exist in the PostgreSQL "enum_sessions_status" type, or the
 * query/insert 500s with: invalid input value for enum enum_sessions_status.
 *
 * Incident 2026-06-13: 'assigned' was declared in Session.mjs SESSION_STATUSES
 * and written by TrainerAssignmentService, but migration 20260122 added
 * 'booked'/'blocked' and OMITTED 'assigned' -> trainer assignment + every
 * scheduling conflict check 500'd in production. This test locks every model
 * session status to a migration that ensures it in the DB enum so the drift
 * cannot silently return.
 */
const root = process.cwd();

const extractSessionStatuses = (src) => {
  const block = src.match(/SESSION_STATUSES\s*=\s*\[([\s\S]*?)\]/);
  if (!block) return [];
  return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
};

// Every enum label introduced by ANY migration that touches enum_sessions_status.
const collectEnsuredStatuses = () => {
  const dir = resolve(root, 'migrations');
  const ensured = new Set();
  for (const file of readdirSync(dir)) {
    if (!/\.(cjs|mjs)$/.test(file)) continue;
    const src = readFileSync(resolve(dir, file), 'utf8');
    if (!src.includes('enum_sessions_status')) continue;
    for (const match of src.matchAll(/'([a-z_]+)'/g)) ensured.add(match[1]);
  }
  return ensured;
};

describe('session status enum drift guard (rule 58)', () => {
  const modelStatuses = extractSessionStatuses(readFileSync(resolve(root, 'models/Session.mjs'), 'utf8'));
  const ensured = collectEnsuredStatuses();

  it('declares the model SESSION_STATUSES set including the trainer-assignment status', () => {
    expect(modelStatuses).toContain('assigned');
    expect(modelStatuses.length).toBeGreaterThanOrEqual(8);
  });

  it('ensures every model session status exists in an enum_sessions_status migration', () => {
    const missing = modelStatuses.filter((status) => !ensured.has(status));
    expect(missing).toEqual([]);
  });

  it("ensures 'assigned' specifically (TrainerAssignmentService writes it; conflictService filters on it)", () => {
    expect(ensured.has('assigned')).toBe(true);
  });
});
