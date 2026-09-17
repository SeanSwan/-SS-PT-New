/**
 * requireSubjectAiConsent — behavioural contract
 * ==============================================
 * The upload lane discloses a CLIENT's session content (voice, injuries,
 * schedule) to a third-party model, so the client's consent governs, not the
 * uploading trainer's.
 *
 * The asymmetry this file exists to lock:
 *   - MISSING profile  → proceed. Profiles are created only by the consent
 *     flow and no backfill migration exists, so a client who was never offered
 *     the flow has no row. Failing closed there would block every upload for
 *     every pre-existing client.
 *   - DISABLED / WITHDRAWN → block. These are recorded decisions by the data
 *     subject and are the cases that carry legal weight (WA My Health My Data,
 *     NV SB 370 treat fitness/injury data as opt-in consumer health data).
 *
 * A regression that flipped either half would be silent in production: the
 * fail-open half would start 403ing real uploads, and the fail-closed half
 * would start disclosing data for users who opted out.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { requireSubjectAiConsent } = await import('../../middleware/aiConsent.mjs');

const makeProfileModel = (profile) => () => ({
  findOne: vi.fn().mockResolvedValue(profile),
});

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

const run = async (profile, req, options = { failOpenWhenMissing: true }) => {
  const gate = requireSubjectAiConsent(
    makeProfileModel(profile),
    (r) => r.body?.clientId,
    options,
  );
  const res = makeRes();
  const next = vi.fn();
  await gate(req, res, next);
  return { res, next };
};

describe('requireSubjectAiConsent — the client is the data subject', () => {
  it('BLOCKS when the subject explicitly disabled AI', async () => {
    const { res, next } = await run({ aiEnabled: false, withdrawnAt: null }, { body: { clientId: '84' } });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_DISABLED');
  });

  it('BLOCKS when the subject withdrew consent', async () => {
    const { res, next } = await run(
      { aiEnabled: true, withdrawnAt: new Date('2026-01-01') },
      { body: { clientId: '84' } },
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_WITHDRAWN');
  });

  it('ALLOWS when the subject consented', async () => {
    const profile = { aiEnabled: true, withdrawnAt: null };
    const req = { body: { clientId: '84' } };
    const { res, next } = await run(profile, req);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    expect(req.aiConsentProfile).toBe(profile);
  });

  it('ALLOWS a missing profile when failOpenWhenMissing (no backfill exists)', async () => {
    const { res, next } = await run(null, { body: { clientId: '84' } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('BLOCKS a missing profile when fail-open is NOT requested', async () => {
    const { res, next } = await run(null, { body: { clientId: '84' } }, { failOpenWhenMissing: false });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_MISSING');
  });

  it('defaults to fail-CLOSED when no options are passed', async () => {
    const gate = requireSubjectAiConsent(makeProfileModel(null), (r) => r.body?.clientId);
    const res = makeRes();
    const next = vi.fn();
    await gate({ body: { clientId: '84' } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('checks the CLIENT, not the requesting trainer', async () => {
    const findOne = vi.fn().mockResolvedValue({ aiEnabled: true, withdrawnAt: null });
    const gate = requireSubjectAiConsent(() => ({ findOne }), (r) => r.body?.clientId, {
      failOpenWhenMissing: true,
    });
    await gate({ body: { clientId: '84' }, user: { id: 7, role: 'trainer' } }, makeRes(), vi.fn());
    expect(findOne).toHaveBeenCalledWith({ where: { userId: 84 } });
  });

  it('rejects an unresolvable subject rather than guessing one', async () => {
    for (const body of [{}, { clientId: 'abc' }, { clientId: '0' }, { clientId: '-3' }, { clientId: '1.5' }]) {
      const { res, next } = await run({ aiEnabled: true, withdrawnAt: null }, { body });
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('AI_CONSENT_SUBJECT_UNRESOLVED');
    }
  });

  it('defers an unresolvable subject to the handler when skipWhenUnresolved', async () => {
    const findOne = vi.fn();
    const gate = requireSubjectAiConsent(() => ({ findOne }), (r) => r.body?.clientId, {
      failOpenWhenMissing: true,
      skipWhenUnresolved: true,
    });
    const res = makeRes();
    const next = vi.fn();
    await gate({ body: {} }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    // Deferring must not look anything up — the handler owns this rejection.
    expect(findOne).not.toHaveBeenCalled();
  });

  it('skipWhenUnresolved still BLOCKS a resolvable subject who opted out', async () => {
    const gate = requireSubjectAiConsent(
      makeProfileModel({ aiEnabled: false, withdrawnAt: null }),
      (r) => r.body?.clientId,
      { failOpenWhenMissing: true, skipWhenUnresolved: true },
    );
    const res = makeRes();
    const next = vi.fn();
    await gate({ body: { clientId: 84 } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_DISABLED');
  });

  it('fails closed on a datastore error — never proceeds on an unknown answer', async () => {
    const gate = requireSubjectAiConsent(
      () => ({ findOne: vi.fn().mockRejectedValue(new Error('db down')) }),
      (r) => r.body?.clientId,
      { failOpenWhenMissing: true },
    );
    const res = makeRes();
    const next = vi.fn();
    await gate({ body: { clientId: '84' } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
  });
});
