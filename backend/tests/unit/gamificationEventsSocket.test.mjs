import { beforeEach, describe, expect, it, vi } from 'vitest';

const emitted = [];

vi.mock('../../socket/socketManager.mjs', () => ({
  getIO: () => ({
    to: (room) => ({
      emit: (event, payload) => emitted.push({ room, event, payload }),
    }),
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const { emitGamificationEvent } = await import('../../socket/gamificationEvents.mjs');

describe('gamificationEvents Socket.IO bridge', () => {
  beforeEach(() => {
    emitted.length = 0;
  });

  it('emits through the primary socket manager in ESM runtime', () => {
    emitGamificationEvent(
      'level_up',
      { userId: 7, level: 3 },
      { debounce: false },
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      room: 'gamification',
      event: 'gamification:level_up',
      payload: {
        userId: 7,
        level: 3,
      },
    });
    expect(emitted[0].payload.timestamp).toEqual(expect.any(String));
  });
});
