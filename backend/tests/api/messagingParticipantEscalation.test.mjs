/**
 * Wave 1 — participant-escalation regression suite
 * ================================================
 * The pre-push panel (DeepSeek v4 Flash and Qwen 3.8, independently; Sol also
 * flagged the adminIds variant) found that the conversation scope validated the
 * thread's EXISTING members but never req.body.participantIds. Because the
 * membership test passes trivially when the only other member IS your assigned
 * trainer, a relationship-only client could create a legitimate trainer thread
 * and then add an arbitrary stranger to it, exposing message history — making
 * the create-scope restriction bypassable in two steps.
 *
 * These are the regressions for that fix. Kept in their own file so the attack
 * they encode stays legible.
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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

describe('P0 — participants being ADDED are validated, not just existing members', () => {
  // Found by the pre-push panel (DeepSeek v4 Flash + Qwen 3.8, independently).
  // The membership check passes trivially when the thread's only other member IS
  // the assigned trainer, so without validating req.body.participantIds the
  // controller would add an arbitrary stranger and hand them the full history.
  // This made the create-scope restriction bypassable in two steps: create a
  // legitimate thread with your trainer, then add anyone to it.
  beforeEach(() => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
  });

  it('403s adding a stranger to a legitimate trainer thread', async () => {
    mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, TRAINER_ID] });
    const res = await request(appWith(freeClient, 'addParticipants'))
      .post('/conversations/42/participants').send({ participantIds: [STRANGER_ID] });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUTSIDE_COACHING_RELATIONSHIP');
  });

  it('403s when a stranger is smuggled in alongside an allowed counterparty', async () => {
    mockSql({ counterparties: [TRAINER_ID, 901], participants: [CLIENT_ID, TRAINER_ID] });
    const res = await request(appWith(freeClient, 'addParticipants'))
      .post('/conversations/42/participants').send({ participantIds: [901, STRANGER_ID] });
    expect(res.status).toBe(403);
  });

  it('allows adding a second assigned counterparty', async () => {
    mockSql({ counterparties: [TRAINER_ID, 901], participants: [CLIENT_ID, TRAINER_ID] });
    const res = await request(appWith(freeClient, 'addParticipants'))
      .post('/conversations/42/participants').send({ participantIds: [901] });
    expect(res.status).toBe(200);
  });

  it('still allows participant-free thread operations', async () => {
    mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, TRAINER_ID] });
    const res = await request(appWith(freeClient, 'conversation'))
      .post('/conversations/42/messages').send({ content: 'hi' });
    expect(res.status).toBe(200);
  });

  it('a subscriber is unaffected — community lane still adds anyone', async () => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'elite', effectiveTier: 'elite', isTrial: false });
    mockSql({ counterparties: [] });
    const res = await request(appWith(freeClient, 'addParticipants'))
      .post('/conversations/42/participants').send({ participantIds: [STRANGER_ID] });
    expect(res.status).toBe(200);
  });
});

describe('adminIds is validated in BOTH scopes, not just conversation', () => {
  // Qwen 3.8 (post-ship panel) read the create scope as validating only
  // participantIds — the manual extraction above the check is for the empty-body
  // 400, and the authorization itself delegates to the shared helper. Disproven
  // by reading, then pinned here so it can never become true.
  beforeEach(() => {
    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
  });

  it('403s creating a thread that smuggles a stranger in via adminIds', async () => {
    mockSql({ counterparties: [TRAINER_ID] });
    const res = await request(appWith(freeClient, 'create'))
      .post('/conversations').send({ participantIds: [TRAINER_ID], adminIds: [STRANGER_ID] });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUTSIDE_COACHING_RELATIONSHIP');
  });

  it('403s adding a stranger as admin to an existing trainer thread', async () => {
    mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, TRAINER_ID] });
    const res = await request(appWith(freeClient, 'addParticipants'))
      .post('/conversations/42/participants').send({ participantIds: [TRAINER_ID], adminIds: [STRANGER_ID] });
    expect(res.status).toBe(403);
  });

  it('allows adminIds when every id is an assigned counterparty', async () => {
    mockSql({ counterparties: [TRAINER_ID] });
    const res = await request(appWith(freeClient, 'create'))
      .post('/conversations').send({ participantIds: [TRAINER_ID], adminIds: [TRAINER_ID] });
    expect(res.status).toBe(200);
  });
});

describe('the gate reads the SAME body fields the controller binds', () => {
  // ox-alpha: if the controller ever bound `userIds` or `members` instead of
  // `participantIds`/`adminIds`, the gate's check would be vacuously true and the
  // escalation this file exists to prevent would reopen silently. Field-name
  // drift has hit this repo three times. This pins the contract at the source.
  it('groupController binds req.body.participantIds and req.body.adminIds', () => {
    const src = readFileSync(resolve(__dirname, '../../controllers/messaging/groupController.mjs'), 'utf8');
    expect(src).toContain('req.body.participantIds');
    expect(src).toContain('req.body.adminIds');
    expect(src).not.toMatch(/req\.body\.(userIds|members|users)/);
  });
});
