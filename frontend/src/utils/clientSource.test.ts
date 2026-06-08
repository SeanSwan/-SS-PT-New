import { describe, expect, it } from 'vitest';
import { isNonDeductingClientSource, normalizeClientSource } from './clientSource';

describe('clientSource', () => {
  it('normalizes Move Fitness and external source variants', () => {
    expect(normalizeClientSource('Move Fitness')).toBe('move_fitness');
    expect(normalizeClientSource(' move-fitness ')).toBe('move_fitness');
    expect(normalizeClientSource('MOVEFITNESS')).toBe('move_fitness');
    expect(normalizeClientSource(' External ')).toBe('external');
  });

  it('treats only Move Fitness and external clients as non-deducting', () => {
    expect(isNonDeductingClientSource(' Move Fitness ')).toBe(true);
    expect(isNonDeductingClientSource('external')).toBe(true);
    expect(isNonDeductingClientSource('swanstudios')).toBe(false);
    expect(isNonDeductingClientSource(undefined)).toBe(false);
  });
});
