/**
 * Hermes service — owner/resource scope (IDOR regression)
 * =======================================================
 * Locks the fix for the verified live IDOR: GET /tasks/:id and GET /tasks
 * returned ANY task to ANY admin/trainer (no ownership check), leaking other
 * operators' full free-text task bodies. The fix enforces ONE fail-closed
 * predicate across getTask / listTasks / cancelTask: admin sees/acts on all;
 * everyone else is scoped to requestedBy === self.
 *
 * TDD: red before the fix (getTask ignored caller; listTasks only filtered when
 * requestedBy was non-null, so ownOnly without requestedBy fail-OPENED).
 */
import { describe, it, expect } from 'vitest';
import { createTask, getTask, listTasks, cancelTask } from '../../services/hermes/hermesService.mjs';

const mk = (requestedBy) =>
  createTask({ agentType: 'dev', taskTitle: 't', taskDescription: 'secret body', requestedBy });

describe('hermesService — getTask ownership (IDOR)', () => {
  it('does not return another operator\'s task to a non-admin', () => {
    const a = mk(1001);
    expect(getTask(a.id, 1002, 'trainer')).toBeNull();        // B cannot read A's
    expect(getTask(a.id, 1001, 'trainer')?.id).toBe(a.id);    // owner can
    expect(getTask(a.id, 9999, 'admin')?.id).toBe(a.id);      // admin can read any
  });
  it('returns null for a missing id regardless of caller', () => {
    expect(getTask('no-such-id', 1001, 'trainer')).toBeNull();
  });
});

describe('hermesService — listTasks scope (fail-closed)', () => {
  it('scopes a non-admin to their own tasks', () => {
    const a = mk(2001);
    const b = mk(2002);
    const ids = listTasks({ requestedBy: 2001, ownOnly: true }).tasks.map(t => t.id);
    expect(ids).toContain(a.id);
    expect(ids).not.toContain(b.id);
  });
  it('lets admin (ownOnly:false) see all', () => {
    const a = mk(2003);
    const b = mk(2004);
    const ids = listTasks({ ownOnly: false }).tasks.map(t => t.id);
    expect(ids).toEqual(expect.arrayContaining([a.id, b.id]));
  });
  it('FAILS CLOSED: ownOnly with no requestedBy returns none of the scoped tasks', () => {
    const a = mk(2005);
    const ids = listTasks({ ownOnly: true }).tasks.map(t => t.id); // requestedBy omitted
    expect(ids).not.toContain(a.id); // must NOT leak everything
  });
});

describe('hermesService — cancelTask consistency (regression guard)', () => {
  it('blocks a non-owner non-admin and allows owner + admin', () => {
    const c = mk(3001);
    expect(cancelTask(c.id, 3002, 'trainer')).toBe(false); // not owner
    expect(cancelTask(c.id, 3001, 'trainer')).toBe(true);  // owner
    const d = mk(3003);
    expect(cancelTask(d.id, 9999, 'admin')).toBe(true);    // admin any
  });
});
