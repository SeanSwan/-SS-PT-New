/**
 * Block enforcement on the messaging paths (launch audit, 2026-07-27).
 *
 * THE DEFECT THIS LOCKS OUT
 * `POST /api/social/friendships/block/:userId` set Friendship.status='blocked',
 * but NEITHER send path ever read it:
 *   - REST   controllers/messaging/messageController.mjs sendMessage
 *   - SOCKET socket/socket.mjs 'send_message'
 * Both checked conversation membership only. Two users who already shared a
 * conversation kept messaging after a block — the Block button lied (rule 75).
 * On a platform serving minors this is the week-one incident shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const findOne = vi.fn();
const query = vi.fn();

vi.mock('../../models/index.mjs', () => ({
  getModel: () => ({ findOne: (...a) => findOne(...a) }),
}));
vi.mock('../../database.mjs', () => ({
  default: { query: (...a) => query(...a) },
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const { canSendToConversation, isBlockedBetween } = await import(
  '../../services/messaging/blockGuard.mjs'
);

const participants = (...ids) => [ids.map((id) => ({ user_id: id }))];

beforeEach(() => {
  findOne.mockReset();
  query.mockReset();
});

describe('isBlockedBetween', () => {
  it('reports a block in either direction', async () => {
    findOne.mockResolvedValue({ id: 1 });
    expect(await isBlockedBetween(1, 2)).toBe(true);
  });

  it('reports no block when none exists', async () => {
    findOne.mockResolvedValue(null);
    expect(await isBlockedBetween(1, 2)).toBe(false);
  });

  it('never treats a user as blocking themselves', async () => {
    expect(await isBlockedBetween(5, 5)).toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });

  // Number(null) === 0 passes Number.isInteger — a null id must NOT reach the
  // query as "user 0". Found by hostile review of this guard.
  it.each([['non-numeric', 'abc'], ['null', null], ['undefined', undefined], ['zero', 0], ['negative', -1]])(
    'rejects a %s id without querying', async (_label, bad) => {
      expect(await isBlockedBetween(bad, 2)).toBe(false);
      expect(await isBlockedBetween(2, bad)).toBe(false);
      expect(findOne).not.toHaveBeenCalled();
    }
  );

  it('queries both directions symmetrically', async () => {
    findOne.mockResolvedValue(null);
    await isBlockedBetween(7, 9);
    const where = findOne.mock.calls[0][0].where;
    expect(where.status).toBe('blocked');
    // Op.or is a Symbol key — JSON.stringify would silently drop it.
    const orKey = Object.getOwnPropertySymbols(where).find((s) => String(s).includes('or'));
    expect(orKey).toBeDefined();
    const pairs = where[orKey];
    expect(pairs).toEqual([
      { requesterId: 7, recipientId: 9 },
      { requesterId: 9, recipientId: 7 },
    ]);
  });
});

describe('canSendToConversation', () => {
  it('BLOCKS a direct message when a block exists', async () => {
    query.mockResolvedValue(participants(1, 2));
    findOne.mockResolvedValue({ id: 99 });

    const result = await canSendToConversation(10, 1);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('blocked');
  });

  // The blocker must not be able to message the person they blocked either.
  it('BLOCKS the blocker too (symmetric)', async () => {
    query.mockResolvedValue(participants(1, 2));
    findOne.mockResolvedValue({ id: 99 });
    expect((await canSendToConversation(10, 2)).allowed).toBe(false);
  });

  it('allows a direct message when no block exists', async () => {
    query.mockResolvedValue(participants(1, 2));
    findOne.mockResolvedValue(null);
    expect((await canSendToConversation(10, 1)).allowed).toBe(true);
  });

  // Group conversations are governed by membership/moderation, not 1:1 blocks.
  it('does not constrain group conversations', async () => {
    query.mockResolvedValue(participants(1, 2, 3));
    const result = await canSendToConversation(10, 1);
    expect(result.allowed).toBe(true);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('allows when the conversation has no other participant', async () => {
    query.mockResolvedValue(participants(1));
    expect((await canSendToConversation(10, 1)).allowed).toBe(true);
  });

  // Deliberate: a DB hiccup must not take messaging down for everyone.
  it('FAILS OPEN when the lookup throws, and says so', async () => {
    query.mockRejectedValue(new Error('db down'));
    const result = await canSendToConversation(10, 1);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('check_failed');
  });

  it('ignores malformed ids rather than throwing', async () => {
    expect((await canSendToConversation('abc', 1)).allowed).toBe(true);
    expect((await canSendToConversation(10, undefined)).allowed).toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('excludes soft-deleted participants from the direct-conversation test', async () => {
    query.mockResolvedValue(participants(1, 2));
    findOne.mockResolvedValue(null);
    await canSendToConversation(10, 1);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('deleted_at IS NULL');
  });
});
