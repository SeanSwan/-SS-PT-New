/**
 * Hermes service - owner/resource scope and terminal-state regression tests.
 *
 * Locks the IDOR fix across get/list/cancel while exercising the durable-service
 * async API through the test-only memory store.
 */
import { beforeEach, describe, it, expect } from 'vitest';
import {
  createTask,
  getTask,
  listTasks,
  cancelTask,
  completeTask,
  resetHermesTaskStoreForTests,
} from '../../services/hermes/hermesService.mjs';

const mk = (requestedBy) => createTask({
  agentType: 'dev',
  taskTitle: 't',
  taskDescription: 'secret body',
  requestedBy,
});

beforeEach(() => {
  resetHermesTaskStoreForTests();
});

describe('hermesService - getTask ownership (IDOR)', () => {
  it('does not return another operator task to a non-admin', async () => {
    const a = await mk(1001);
    expect(await getTask(a.id, 1002, 'trainer')).toBeNull();
    expect((await getTask(a.id, 1001, 'trainer'))?.id).toBe(a.id);
    expect((await getTask(a.id, 9999, 'admin'))?.id).toBe(a.id);
  });

  it('returns null for a missing id regardless of caller', async () => {
    expect(await getTask('no-such-id', 1001, 'trainer')).toBeNull();
  });
});

describe('hermesService - createTask auth provenance', () => {
  it('rejects task creation without a requester id', async () => {
    await expect(createTask({
      agentType: 'dev',
      taskTitle: 't',
      taskDescription: 'secret body',
      requestedBy: undefined,
    })).rejects.toThrow('requestedBy');
  });
});
describe('hermesService - listTasks scope (fail-closed)', () => {
  it('scopes a non-admin to their own tasks', async () => {
    const a = await mk(2001);
    const b = await mk(2002);
    const ids = (await listTasks({ requestedBy: 2001, ownOnly: true })).tasks.map(t => t.id);
    expect(ids).toContain(a.id);
    expect(ids).not.toContain(b.id);
  });

  it('lets admin (ownOnly:false) see all', async () => {
    const a = await mk(2003);
    const b = await mk(2004);
    const ids = (await listTasks({ ownOnly: false })).tasks.map(t => t.id);
    expect(ids).toEqual(expect.arrayContaining([a.id, b.id]));
  });

  it('fails closed: ownOnly with no requestedBy returns none of the scoped tasks', async () => {
    const a = await mk(2005);
    const ids = (await listTasks({ ownOnly: true })).tasks.map(t => t.id);
    expect(ids).not.toContain(a.id);
  });
});

describe('hermesService - terminal transitions', () => {
  it('blocks a non-owner non-admin and allows owner plus admin cancellation', async () => {
    const c = await mk(3001);
    expect(await cancelTask(c.id, 3002, 'trainer')).toBe(false);
    expect(await cancelTask(c.id, 3001, 'trainer')).toBe(true);
    const d = await mk(3003);
    expect(await cancelTask(d.id, 9999, 'admin')).toBe(true);
  });

  it('marks a task completed once and blocks later terminal rewrites', async () => {
    const task = await mk(4001);
    const completed = await completeTask(task.id, 4001, 'trainer', 'Client received next step');
    expect(completed?.status).toBe('completed');
    expect(completed?.terminalReason).toBe('Client received next step');
    expect(completed?.completedBy).toBe(4001);
    expect(await cancelTask(task.id, 4001, 'trainer')).toBe(false);
  });
});
