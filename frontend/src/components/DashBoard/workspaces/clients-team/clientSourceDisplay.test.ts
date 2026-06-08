import { describe, expect, it } from 'vitest';
import {
  getClientSourceLabel,
  getClientSourceShortLabel,
  getClientSourceTone,
} from './clientSourceDisplay';

describe('clientSourceDisplay', () => {
  it('normalizes human-formatted source values before rendering labels', () => {
    expect(getClientSourceLabel('Move Fitness')).toBe('Move Fitness');
    expect(getClientSourceShortLabel(' move-fitness ')).toBe('MF');
    expect(getClientSourceTone('MOVE FITNESS')).toBe('mf');

    expect(getClientSourceLabel(' External ')).toBe('External');
    expect(getClientSourceShortLabel('external')).toBe('EXT');
    expect(getClientSourceTone('EXTERNAL')).toBe('external');
  });
});
