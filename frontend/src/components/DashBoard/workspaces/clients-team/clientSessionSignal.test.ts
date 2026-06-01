import { describe, expect, it } from 'vitest';
import { getClientSessionSignal } from './clientSessionSignal';

describe('getClientSessionSignal', () => {
  it('reports SwanStudios clients as paid session balances', () => {
    expect(getClientSessionSignal({ clientSource: 'swanstudios', availableSessions: 4 })).toEqual({
      label: '4 paid sessions',
      note: 'deducts when logged',
      tone: 'gold',
    });
  });

  it('reports non-deducting client sources as free tracking', () => {
    expect(getClientSessionSignal({ clientSource: 'move_fitness', availableSessions: 0 })).toEqual({
      label: 'free tracking',
      note: 'no deduction',
      tone: 'neutral',
    });

    expect(getClientSessionSignal({ clientSource: 'external', availableSessions: 0 })).toEqual({
      label: 'free tracking',
      note: 'no deduction',
      tone: 'neutral',
    });
  });

  it('treats malformed paid-session balances as zero instead of rendering NaN', () => {
    expect(getClientSessionSignal({ clientSource: 'swanstudios', availableSessions: 'not-a-number' as any })).toEqual({
      label: '0 paid sessions',
      note: 'refill soon',
      tone: 'warning',
    });
  });
});
