/**
 * Wave 1 — the relationship lane applies to the SOCKET path too
 * ============================================================
 * The lane shipped as Express middleware on messagingRoutes only.
 * `socket/socket.mjs` is a complete second way to send a message and checked
 * membership alone, so a free-tier client with an active assignment was 403'd
 * by REST on an old community thread and could still write to it over the
 * websocket.
 *
 * Two post-ship reviewers (ox-alpha, GLM 5.3) flagged the socket path
 * independently. That file's OWN comment already stated the principle —
 * "Fixing only REST would have been a false fix" — about the block check and
 * rate limiter. The lane reproduced the exact mistake the file warns about.
 *
 * These tests pin the shared check both paths now call.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../../database.mjs', () => ({ default: { query: queryMock } }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { isRelationshipWriteAllowed } = await import('../../services/messagingAccessRepository.mjs');

const CLIENT = 501;
const TRAINER = 900;
const STRANGER = 777;

function mockSql({ counterparties = [], participants = [], throwOn = null } = {}) {
  queryMock.mockImplementation(async (sql) => {
    if (sql.includes('client_trainer_assignments')) {
      if (throwOn === 'assignments') throw new Error('db down');
      return counterparties.map((c) => ({ counterparty: c }));
    }
    if (sql.includes('conversation_participants')) {
      if (throwOn === 'participants') throw new Error('db down');
      // Rows now carry the PLATFORM role so the write gate can mirror the list
      // rule. Accepts a bare id or {id, role}.
      return participants.map((u) => (
        typeof u === 'object' ? { userId: u.id, platformRole: u.role } : { userId: u, platformRole: 'client' }
      ));
    }
    return [];
  });
}

const freeClient = { id: String(CLIENT), role: 'client' };

beforeEach(() => vi.clearAllMocks());

describe('isRelationshipWriteAllowed — the socket/REST shared seam', () => {
  it('allows writing to the assigned trainer thread on a free tier', async () => {
    mockSql({ counterparties: [TRAINER], participants: [CLIENT, TRAINER] });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(true);
  });

  it('BLOCKS writing to a legacy community thread the client still sits in', async () => {
    // The exact bypass: membership alone used to be enough over the socket.
    mockSql({ counterparties: [TRAINER], participants: [CLIENT, STRANGER] });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
  });

  it('blocks a thread mixing the trainer with a stranger', async () => {
    mockSql({ counterparties: [TRAINER], participants: [CLIENT, TRAINER, STRANGER] });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
  });

  it('blocks a thread the actor is not a member of', async () => {
    mockSql({ counterparties: [TRAINER], participants: [TRAINER] });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
  });

  it('allows anything for a community-entitled sender, without touching the DB', async () => {
    mockSql({ counterparties: [] });
    await expect(isRelationshipWriteAllowed(freeClient, 42, true)).resolves.toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('allows staff without touching the DB', async () => {
    await expect(isRelationshipWriteAllowed({ id: '900', role: 'trainer' }, 42, false)).resolves.toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('denies a client with no assignment at all', async () => {
    mockSql({ counterparties: [], participants: [CLIENT, TRAINER] });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
  });

  it('fails CLOSED when the assignment lookup throws', async () => {
    mockSql({ throwOn: 'assignments' });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
  });

  it('fails CLOSED when the participant lookup throws', async () => {
    mockSql({ counterparties: [TRAINER], throwOn: 'participants' });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
  });

  it('matches string-shaped ids from either side', async () => {
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('client_trainer_assignments')) return [{ counterparty: String(TRAINER) }];
      if (sql.includes('conversation_participants')) {
        return [{ userId: String(CLIENT) }, { userId: String(TRAINER) }];
      }
      return [];
    });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(true);
  });
});

describe('staff threads are writable, exactly as they are listable', () => {
  // GLM 5.3, UX panel: the LIST filter was widened to keep the auto-created
  // admin support thread visible, and this gate was not — so that thread became
  // visible-but-unwritable and answered a reply with "You can message your
  // assigned trainer here" on a thread containing an ADMIN. A read-only dead end
  // with lying copy is worse than the hidden thread it replaced.
  it('allows writing to the admin support thread', async () => {
    mockSql({
      counterparties: [TRAINER],
      participants: [{ id: CLIENT, role: 'client' }, { id: 1, role: 'admin' }],
    });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(true);
  });

  it('allows writing to a thread with a non-assigned TRAINER', async () => {
    mockSql({
      counterparties: [TRAINER],
      participants: [{ id: CLIENT, role: 'client' }, { id: 950, role: 'trainer' }],
    });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(true);
  });

  it('still blocks a thread mixing staff with a stranger', async () => {
    mockSql({
      counterparties: [TRAINER],
      participants: [
        { id: CLIENT, role: 'client' },
        { id: 1, role: 'admin' },
        { id: STRANGER, role: 'client' },
      ],
    });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
  });

  it('cannot be spoofed by a client holding conversation-admin in a group', async () => {
    // The gate reads Users.role, never conversation_participants.role. A client
    // who is group-admin is still role 'client' here. GLM raised this as the
    // scope-leak candidate; the SQL disproves it and this pins it.
    mockSql({
      counterparties: [TRAINER],
      participants: [{ id: CLIENT, role: 'client' }, { id: STRANGER, role: 'client' }],
    });
    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
  });
});
