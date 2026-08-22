/**
 * Wave 1 Slice 2 — messaging capabilities endpoint
 * ================================================
 * Split out of messagingRelationshipLane.test.mjs on 2026-08-22 to stay under
 * the 300-line file cap (flagged by the pre-push panel). Same fixtures, same
 * mocks; this half covers the endpoint that REPORTS access, while the other
 * half covers the middleware that ENFORCES it. The agreement test below is the
 * seam between them.
 *
 * Original context
 * ----------------
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
 *   AC6  assignment lookup throws       -> denied (FAIL CLOSED)
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
      return participants.map((u) => ({ userId: u }));
    }
    return [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  gatingEnabledMock.mockReturnValue(true);
});

describe('resolveMessagingCapabilities (GET /api/messaging/capabilities)', () => {
  // The endpoint must be computed by the SAME rules the gate enforces —
  // a separately-derived answer is how the original divergence survived.
  const req = (user) => ({ user });

  it('reports the coach lane open and the community lane closed for a free client with a trainer', async () => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
    mockSql({ counterparties: [TRAINER_ID] });
    await expect(resolveMessagingCapabilities(req(freeClient))).resolves.toEqual({
      canMessageAssignedCoach: true,
      canUseCommunityDirectMessages: false,
    });
  });

  it('reports both lanes open for a subscriber with no assignment', async () => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'elite', effectiveTier: 'elite', isTrial: false });
    mockSql({ counterparties: [] });
    await expect(resolveMessagingCapabilities(req(freeClient))).resolves.toEqual({
      canMessageAssignedCoach: true,
      canUseCommunityDirectMessages: true,
    });
  });

  it('reports both lanes open for a live trial, matching what the gate allows', async () => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'elite', isTrial: true });
    mockSql({ counterparties: [] });
    await expect(resolveMessagingCapabilities(req(freeClient))).resolves.toEqual({
      canMessageAssignedCoach: true,
      canUseCommunityDirectMessages: true,
    });
  });

  it('reports both closed for a free client with no assignment', async () => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
    mockSql({ counterparties: [] });
    await expect(resolveMessagingCapabilities(req(freeClient))).resolves.toEqual({
      canMessageAssignedCoach: false,
      canUseCommunityDirectMessages: false,
    });
  });

  it('reports both open for staff without touching the DB', async () => {
    await expect(resolveMessagingCapabilities(req({ id: '900', role: 'trainer' }))).resolves.toEqual({
      canMessageAssignedCoach: true,
      canUseCommunityDirectMessages: true,
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('reports both closed when unauthenticated', async () => {
    await expect(resolveMessagingCapabilities({ user: undefined })).resolves.toEqual({
      canMessageAssignedCoach: false,
      canUseCommunityDirectMessages: false,
    });
  });

  it('agrees with the gate: capabilities false implies the gate denies', async () => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
    mockSql({ counterparties: [] });
    const caps = await resolveMessagingCapabilities(req(freeClient));
    const res = await request(appWith(freeClient, 'list')).get('/conversations');
    expect(caps.canMessageAssignedCoach).toBe(false);
    expect(res.status).toBe(402);
  });
});
