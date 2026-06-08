import { describe, expect, it } from 'vitest';
import { getClientSourceLabel } from './MyClientsView.logic';

describe('MyClientsView logic', () => {
  it('normalizes human-formatted client source labels before trainer card display', () => {
    expect(getClientSourceLabel(' Move Fitness ')).toBe('Move Fitness tracking');
    expect(getClientSourceLabel('move-fitness')).toBe('Move Fitness tracking');
    expect(getClientSourceLabel('EXTERNAL')).toBe('External tracking');
  });
});
