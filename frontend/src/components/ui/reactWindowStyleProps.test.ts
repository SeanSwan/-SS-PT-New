import { describe, expect, it } from 'vitest';
import { reactWindowStyleProps } from './reactWindowStyleProps';

describe('reactWindowStyleProps', () => {
  it('preserves react-window positioning styles by reference', () => {
    const style = {
      position: 'absolute' as const,
      height: 72,
      top: 144,
      width: '100%',
    };

    expect(reactWindowStyleProps(style)).toEqual({ style });
    expect(reactWindowStyleProps(style).style).toBe(style);
  });
});
