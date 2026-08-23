/**
 * Wave 1 — relationship-only viewers do not see legacy community threads
 * =====================================================================
 * Pre-push panel (GLM 5.3 and Sol 5.6 Pro, independently): opening the list
 * gate to anyone with an active assignment widened access. The list response
 * carries last-message preview `content` and participant names/photos, so a
 * subscriber who downgraded but kept a trainer went from 402-and-nothing to
 * seeing previews of community threads whose read endpoints now 403.
 *
 * The gate decides ACCESS; the controller decides SCOPE. These tests pin the
 * scope half.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConversationsForViewerMock, ensureAdminConversationMock } = vi.hoisted(() => ({
  getConversationsForViewerMock: vi.fn(),
  ensureAdminConversationMock: vi.fn(),
}));

vi.mock('../../services/messagingRepository.mjs', () => ({
  getConversationsForViewer: getConversationsForViewerMock,
  ensureAdminConversation: ensureAdminConversationMock,
  ensureMessagingTables: vi.fn().mockResolvedValue(undefined),
  normalizeParticipantIds: vi.fn(),
  normalizeAdminIds: vi.fn(),
  fetchActiveUserIds: vi.fn(),
  upsertConversationParticipant: vi.fn(),
  reviveParticipant: vi.fn(),
  softDeleteParticipant: vi.fn(),
  getConversationMembership: vi.fn(),
  getActiveParticipant: vi.fn(),
  updateParticipantRoleRecord: vi.fn(),
  findDirectConversation: vi.fn(),
  sequelize: { transaction: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { getConversations } = await import('../../controllers/messaging/conversationController.mjs');

const VIEWER = 501;
const TRAINER = 900;
const STRANGER = 777;

const thread = (id, otherIds) => ({
  id,
  participants: [{ id: VIEWER }, ...otherIds.map((uid) => ({ id: uid }))],
});

/** A thread whose other member is staff, e.g. the auto-created admin channel. */
const staffThread = (id, staffId, role = 'admin') => ({
  id,
  participants: [{ id: VIEWER }, { id: staffId, role }],
});

function res() {
  const r = { statusCode: 200, body: null };
  r.status = (code) => { r.statusCode = code; return r; };
  r.json = (payload) => { r.body = payload; return r; };
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  ensureAdminConversationMock.mockResolvedValue(undefined);
});

describe('relationship-only list narrowing', () => {
  it('hides a legacy community thread while keeping the trainer thread', async () => {
    getConversationsForViewerMock.mockResolvedValue([
      thread(1, [TRAINER]),
      thread(2, [STRANGER]),
    ]);

    const r = res();
    await getConversations(
      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
      r,
    );

    expect(r.body.map((c) => c.id)).toEqual([1]);
  });

  it('hides a group that mixes the trainer with a stranger', async () => {
    getConversationsForViewerMock.mockResolvedValue([thread(3, [TRAINER, STRANGER])]);

    const r = res();
    await getConversations(
      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
      r,
    );

    expect(r.body).toHaveLength(0);
  });

  it('does NOT narrow for a community-entitled viewer', async () => {
    getConversationsForViewerMock.mockResolvedValue([
      thread(1, [TRAINER]),
      thread(2, [STRANGER]),
    ]);

    // No relationship lane set — the community lane passed the gate.
    const r = res();
    await getConversations({ user: { id: VIEWER } }, r);

    expect(r.body.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe('staff threads stay visible to relationship-only viewers', () => {
  // ensureAdminConversation creates a direct admin support thread for every
  // viewer. The admin is not a training counterparty, so narrowing on
  // assignments alone hid a channel the system had just created for them
  // (GLM 5.3, post-ship panel). The lane hides COMMUNITY threads, not staff.
  it('keeps the auto-created admin support thread', async () => {
    getConversationsForViewerMock.mockResolvedValue([
      staffThread(9, 1, 'admin'),
      thread(2, [STRANGER]),
    ]);
    const r = res();
    await getConversations(
      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
      r,
    );
    expect(r.body.map((c) => c.id)).toEqual([9]);
  });

  it('keeps a trainer-role thread even when that trainer is not an assigned counterparty', async () => {
    getConversationsForViewerMock.mockResolvedValue([staffThread(11, 950, 'trainer')]);
    const r = res();
    await getConversations(
      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
      r,
    );
    expect(r.body.map((c) => c.id)).toEqual([11]);
  });

  it('still hides a thread mixing staff with a stranger', async () => {
    getConversationsForViewerMock.mockResolvedValue([{
      id: 12,
      participants: [{ id: VIEWER }, { id: 1, role: 'admin' }, { id: STRANGER, role: 'client' }],
    }]);
    const r = res();
    await getConversations(
      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
      r,
    );
    expect(r.body).toHaveLength(0);
  });
});
