import { describe, expect, it } from 'vitest';
import { victoryStyleProps } from './victoryStyleProps';

describe('victoryStyleProps', () => {
  it('preserves the exact Victory style contract in a spreadable prop object', () => {
    const style = {
      data: { stroke: 'var(--accent-primary, #60C0F0)', strokeWidth: 3 },
      labels: { fill: 'var(--text-primary, #E0ECF4)' },
    };

    expect(victoryStyleProps(style)).toEqual({ style });
    expect(victoryStyleProps(style).style).toBe(style);
  });
});
