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
      return participants.map((u) => ({ userId: u }));
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
