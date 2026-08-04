/**
 * Communication draft ownership contract (cross-tenant IDOR)
 * ==========================================================
 * `rejectDraft` and `deleteDraft` shipped with NO ownership check. The router is gated to
 * `['trainer','admin']`, so this was not public exposure — but any trainer could reject, or
 * permanently `destroy()`, ANOTHER trainer's pending client communications. `deleteDraft` is a
 * hard delete: the victim's draft is gone with no audit trail and no error anywhere.
 *
 * `approveDraft` had a check, `listDrafts` scoped its query, and the other two did not. That
 * asymmetry is the tell — a rule enforced in some handlers and not others is a rule that will be
 * missed again, which is why the check is now ONE shared function.
 *
 * These tests assert the attack is blocked, not merely that the happy path works. A test that only
 * proves "the owner can delete their draft" passes just as happily against the vulnerable code.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const OWNER = { id: 7, role: 'trainer' };
const ATTACKER = { id: 99, role: 'trainer' };
const ADMIN = { id: 1, role: 'admin' };
const CLIENT = { id: 42, role: 'client' };

async function loadController({ draft } = {}) {
  vi.resetModules();
  const destroy = vi.fn(async () => undefined);
  const update = vi.fn(async () => undefined);
  const row = draft === null ? null : { status: 'pending_approval', trainerId: 7, destroy, update, ...draft };

  // The controller lazily imports the model file directly and caches it at module scope, so the
  // mock must target that path and `vi.resetModules()` must run between tests to clear the cache.
  vi.doMock('../../models/CommunicationDraft.mjs', () => ({
    default: { findByPk: vi.fn(async () => row) },
  }));

  const mod = await import('../../controllers/communicationDraftController.mjs');
  return { mod, destroy, update, row };
}

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

describe('communication draft ownership', () => {
  it('BLOCKS a foreign trainer from DELETING another trainer\'s draft', async () => {
    const { mod, destroy } = await loadController();
    const res = mockRes();
    await mod.deleteDraft({ user: ATTACKER, params: { draftId: '1' }, body: {} }, res);

    expect(destroy).not.toHaveBeenCalled();       // the irreversible act must not happen
    expect(res.statusCode).toBe(404);              // 404 not 403 — do not confirm the ID exists
  });

  it('BLOCKS a foreign trainer from REJECTING another trainer\'s draft', async () => {
    const { mod, update } = await loadController();
    const res = mockRes();
    await mod.rejectDraft({ user: ATTACKER, params: { draftId: '1' }, body: { reason: 'x' } }, res);

    expect(update).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('does not leak draft STATE to a foreign trainer via the error message', async () => {
    // Ownership must be checked BEFORE the status branch, or a 400 "already sent" tells the
    // attacker both that the draft exists and what state it is in.
    const { mod } = await loadController({ draft: { status: 'sent' } });
    const res = mockRes();
    await mod.rejectDraft({ user: ATTACKER, params: { draftId: '1' }, body: {} }, res);

    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('sent');
  });

  it('ALLOWS the owning trainer to delete their own draft', async () => {
    const { mod, destroy } = await loadController();
    const res = mockRes();
    await mod.deleteDraft({ user: OWNER, params: { draftId: '1' }, body: {} }, res);

    expect(destroy).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('ALLOWS an admin to act on any trainer\'s draft (intentional)', async () => {
    const { mod, destroy } = await loadController();
    const res = mockRes();
    await mod.deleteDraft({ user: ADMIN, params: { draftId: '1' }, body: {} }, res);

    expect(destroy).toHaveBeenCalled();
  });

  it('denies an unexpected role rather than defaulting open', async () => {
    // The router gates to trainer/admin today. If that gate is ever loosened, the controller must
    // still refuse — defence in depth, not a single point of failure.
    const { mod, destroy } = await loadController();
    const res = mockRes();
    await mod.deleteDraft({ user: CLIENT, params: { draftId: '1' }, body: {} }, res);

    expect(destroy).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });
});
