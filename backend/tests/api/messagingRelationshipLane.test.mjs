/**
 * Wave 1 Slice 1 — messaging relationship lane
 * ============================================
 * Proves the fix for the P0 found by the client-dashboard hostile review:
 * `requireTier('elite','trainer.messaging')` gated a COACHING capability on a
 * BILLING tier, so a client on a training package (tier stays 'free' — no
 * purchase controller writes `tier`) was 402'd out of contacting their trainer.
 *
 * Acceptance criteria under test (Fable ruling §4, slice 1):
 *   AC1  free tier + active assignment  -> 200 on list / create / send
 *   AC2  same user, unrelated recipient -> 403 OUTSIDE_COACHING_RELATIONSHIP
 *   AC3  elite, no assignment           -> 200 community DMs (UNCHANGED)
 *   AC4  free tier, no assignment       -> 402 everywhere (UNCHANGED)
 *   AC5  live trial                     -> permitted (UNCHANGED, matches API)
 *   AC6  assignment lookup throws       -> 503 (FAIL CLOSED, not a paywall)
 *
 * The middleware is mounted on a bare express app; controllers are stubs.
 * Only authorization wiring is under test.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { queryMock, resolveEntitlementMock, gatingEnabledMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  resolveEntitlementMock: vi.fn(),
  gatingEnabledMock: vi.fn(() => true),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: queryMock },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/requireTier.mjs', () => ({
  resolveCurrentEntitlement: resolveEntitlementMock,
  isGatingEnabled: gatingEnabledMock,
}));

vi.mock('../../config/tierCatalog.mjs', () => ({
  // Minimal ordering that mirrors the real catalog for the tiers we exercise.
  meetsMinimumTier: (effective, minimum) => {
    const rank = { free: 0, pro: 1, elite: 2, premium: 2 };
    return (rank[effective] ?? 0) >= (rank[minimum] ?? 0);
  },
  tierDisplayName: (t) => t,
  featureLabel: (k) => k,
}));

const { requireMessagingAccess, resolveMessagingCapabilities } =
  await import('../../middleware/requireMessagingAccess.mjs');

const CLIENT_ID = 501;
const TRAINER_ID = 900;
const STRANGER_ID = 777;

/** `protect` stores req.user.id as a STRING — reproduce that faithfully. */
function appWith(user, scope) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  const mw = requireMessagingAccess({ scope });
  if (scope === 'conversation') {
    app.post('/conversations/:id/messages', mw, (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
  } else if (scope === 'addParticipants') {
    app.post('/conversations/:id/participants', requireMessagingAccess({ scope: 'conversation' }),
      (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
  } else if (scope === 'create') {
    app.post('/conversations', mw, (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
  } else {
    app.get('/conversations', mw, (_req, res) => res.status(200).json({ ok: true }));
  }
  return app;
}

const freeClient = { id: String(CLIENT_ID), role: 'client' };

/**
 * Route the two SQL shapes this middleware issues.
 * @param {number[]} counterparties assignment rows
 * @param {number[]} participants   other participants of the conversation
 */
function mockSql({ counterparties = [], participants = [], throwOn = null } = {}) {
  queryMock.mockImplementation(async (sql) => {
    if (sql.includes('client_trainer_assignments')) {
      if (throwOn === 'assignments') throw new Error('db down');
      return counterparties.map((c) => ({ counterparty: c }));
    }
    if (sql.includes('conversation_participants')) {
      if (throwOn === 'participants') throw new Error('db down');
      // Rows carry the PLATFORM role so both gates can honour staff identically.
      return participants.map((u) => (
        typeof u === 'object' ? { userId: u.id, platformRole: u.role } : { userId: u, platformRole: 'client' }
      ));
    }
    return [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  gatingEnabledMock.mockReturnValue(true);
});

describe('requireMessagingAccess', () => {
  describe('AC1 — free tier WITH an active assignment reaches the trainer', () => {
    beforeEach(() => {
      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
    });

    it('allows listing conversations', async () => {
      mockSql({ counterparties: [TRAINER_ID] });
      const res = await request(appWith(freeClient, 'list')).get('/conversations');
      expect(res.status).toBe(200);
    });

    it('allows creating a conversation with the assigned trainer', async () => {
      mockSql({ counterparties: [TRAINER_ID] });
      const res = await request(appWith(freeClient, 'create'))
        .post('/conversations').send({ participantIds: [TRAINER_ID] });
      expect(res.status).toBe(200);
      expect(res.body.lane).toBe('relationship');
    });

    it('allows sending into a thread whose only other member is the trainer', async () => {
      mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, TRAINER_ID] });
      const res = await request(appWith(freeClient, 'conversation'))
        .post('/conversations/42/messages').send({ content: 'my knee hurts' });
      expect(res.status).toBe(200);
      expect(res.body.lane).toBe('relationship');
    });
  });

  describe('AC2 — the relationship lane does NOT open community DMs', () => {
    beforeEach(() => {
      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
    });

    it('403s creating a conversation with an unrelated member', async () => {
      mockSql({ counterparties: [TRAINER_ID] });
      const res = await request(appWith(freeClient, 'create'))
        .post('/conversations').send({ participantIds: [STRANGER_ID] });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('OUTSIDE_COACHING_RELATIONSHIP');
    });

    it('403s a group that mixes the trainer with an unrelated member', async () => {
      mockSql({ counterparties: [TRAINER_ID] });
      const res = await request(appWith(freeClient, 'create'))
        .post('/conversations').send({ participantIds: [TRAINER_ID, STRANGER_ID] });
      expect(res.status).toBe(403);
    });

    it('403s sending into a thread containing an unrelated member', async () => {
      mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, STRANGER_ID] });
      const res = await request(appWith(freeClient, 'conversation'))
        .post('/conversations/42/messages').send({ content: 'hi' });
      expect(res.status).toBe(403);
    });
  });

  describe('AC3 — elite with NO assignment keeps full community messaging', () => {
    it('allows an unrelated recipient and never queries assignments', async () => {
      resolveEntitlementMock.mockResolvedValue({ actualTier: 'elite', effectiveTier: 'elite', isTrial: false });
      mockSql({ counterparties: [] });
      const res = await request(appWith({ id: '601', role: 'client' }, 'create'))
        .post('/conversations').send({ participantIds: [STRANGER_ID] });
      expect(res.status).toBe(200);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('AC4 — free tier with NO assignment is still gated', () => {
    it('402s with the requireTier-compatible payload', async () => {
      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
      mockSql({ counterparties: [] });
      const res = await request(appWith(freeClient, 'list')).get('/conversations');
      expect(res.status).toBe(402);
      expect(res.body.code).toBe('TIER_REQUIRED');
      expect(res.body.upgradeUrl).toBe('/ascension');
    });
  });

  describe('AC5 — a live trial is permitted, unchanged', () => {
    it('allows community DMs on the elite-equivalent effective tier', async () => {
      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'elite', isTrial: true });
      mockSql({ counterparties: [] });
      const res = await request(appWith(freeClient, 'create'))
        .post('/conversations').send({ participantIds: [STRANGER_ID] });
      expect(res.status).toBe(200);
    });
  });

  describe('AC6 — fail closed', () => {
    beforeEach(() => {
      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
    });

    it('fails CLOSED as 503 when the assignment lookup throws (was a paywall)', async () => {
      // RE-ANCHORED 2026-08-25: asserted 402. A failed lookup is not "you have
      // no trainer" — it rendered the upsell to a paying client with an active
      // assignment during a transient DB fault, in the exact words this
      // middleware exists to stop (GLM 5.3). Still fail-closed, now honest.
      mockSql({ throwOn: 'assignments' });
      const res = await request(appWith(freeClient, 'list')).get('/conversations');
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('MESSAGING_LOOKUP_UNAVAILABLE');
    });

    it('denies when the participant lookup throws', async () => {
      mockSql({ counterparties: [TRAINER_ID], throwOn: 'participants' });
      const res = await request(appWith(freeClient, 'conversation'))
        .post('/conversations/42/messages').send({ content: 'hi' });
      expect(res.status).toBe(403);
    });

    it('denies a thread the actor is NOT a member of, even if the only other member is their trainer', async () => {
      // Self-hostile-review finding: without an explicit membership check, a
      // conversation containing only the assigned trainer satisfies the subset
      // test while the actor is not in the thread at all.
      mockSql({ counterparties: [TRAINER_ID], participants: [TRAINER_ID] });
      const res = await request(appWith(freeClient, 'conversation'))
        .post('/conversations/42/messages').send({ content: 'hi' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('OUTSIDE_COACHING_RELATIONSHIP');
    });

    it('denies a trainer-to-other-client thread the actor is not in', async () => {
      mockSql({ counterparties: [TRAINER_ID], participants: [TRAINER_ID, STRANGER_ID] });
      const res = await request(appWith(freeClient, 'conversation'))
        .post('/conversations/42/messages').send({ content: 'hi' });
      expect(res.status).toBe(403);
    });

    it('denies a thread with no resolvable other participants', async () => {
      mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID] });
      const res = await request(appWith(freeClient, 'conversation'))
        .post('/conversations/42/messages').send({ content: 'hi' });
      expect(res.status).toBe(403);
    });
  });

  describe('preserved behavior', () => {
    it('staff bypass short-circuits before any entitlement or SQL work', async () => {
      const res = await request(appWith({ id: '900', role: 'trainer' }, 'create'))
        .post('/conversations').send({ participantIds: [STRANGER_ID] });
      expect(res.status).toBe(200);
      expect(resolveEntitlementMock).not.toHaveBeenCalled();
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('the TIER_GATING_ENABLED kill switch still opens everything', async () => {
      gatingEnabledMock.mockReturnValue(false);
      const res = await request(appWith(freeClient, 'create'))
        .post('/conversations').send({ participantIds: [STRANGER_ID] });
      expect(res.status).toBe(200);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('unauthenticated requests 401 before any lookup', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => { req.user = undefined; next(); });
      app.get('/conversations', requireMessagingAccess({ scope: 'list' }), (_r, res) => res.json({ ok: true }));
      const res = await request(app).get('/conversations');
      expect(res.status).toBe(401);
    });
  });

  describe('string/number id safety', () => {
    it('matches a counterparty returned as a string against a string req.user.id', async () => {
      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
      queryMock.mockImplementation(async (sql) => {
        if (sql.includes('client_trainer_assignments')) return [{ counterparty: String(TRAINER_ID) }];
        if (sql.includes('conversation_participants')) {
          return [{ userId: String(CLIENT_ID), platformRole: 'client' }, { userId: String(TRAINER_ID), platformRole: 'trainer' }];
        }
        return [];
      });
      const res = await request(appWith(freeClient, 'conversation'))
        .post('/conversations/42/messages').send({ content: 'hi' });
      expect(res.status).toBe(200);
    });
  });
});
