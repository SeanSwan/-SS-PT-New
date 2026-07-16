import { motionValue } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { motionStyleProps } from './motionStyleProps';

describe('motionStyleProps', () => {
  it('preserves MotionValues for Framer Motion without converting them to CSS classes', () => {
    const y = motionValue(0);
    const scaleX = motionValue(1);
    const style = { y, scaleX };

    expect(motionStyleProps(style)).toEqual({ style });
    expect(motionStyleProps(style).style.y).toBe(y);
    expect(motionStyleProps(style).style.scaleX).toBe(scaleX);
    expect(motionStyleProps(undefined)).toEqual({ style: undefined });
  });
});
