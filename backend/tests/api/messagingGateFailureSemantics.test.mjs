/**
 * FAILURE SEMANTICS of the messaging gate — what a client sees when the lookup
 * itself fails, as distinct from being legitimately denied.
 * Split from messagingRelationshipLane.test.mjs 2026-08-25 for the 300-line cap.
 *
 * The distinction is the point: fail-closed must not mean fail-into-a-lie. A DB
 * fault used to render the 402 upsell, telling a paying client with an active
 * trainer to upgrade during an outage (GLM 5.3).
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

describe('a DB fault is not a paywall', () => {
  // GLM 5.3: a failed counterparty lookup rendered as the 402 upsell — a paying
  // client with an active trainer told to upgrade during a transient outage.
  it('503s when the assignment lookup fails, never 402', async () => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('client_trainer_assignments')) throw new Error('db down');
      return [];
    });
    const res = await request(appWith(freeClient, 'list')).get('/conversations');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('MESSAGING_LOOKUP_UNAVAILABLE');
  });
});
