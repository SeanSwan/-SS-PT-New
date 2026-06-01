import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getClientSourcePolicy } from './SettingsTabContent.logic';

describe('SettingsTabContent client-source policy contract', () => {
  it('maps client source into the visible billing policy copy', () => {
    expect(getClientSourcePolicy('swanstudios')).toEqual({
      label: 'SwanStudios paid',
      note: 'Deduct after completed logged workouts.',
    });
    expect(getClientSourcePolicy('move_fitness')).toEqual({
      label: 'Move Fitness free tracking',
      note: 'Free tracking - no deduction.',
    });
    expect(getClientSourcePolicy('external')).toEqual({
      label: 'External free tracking',
      note: 'No deduction until this client is reclassified.',
    });
    expect(getClientSourcePolicy('unknown')).toEqual({
      label: 'SwanStudios paid',
      note: 'Deduct after completed logged workouts.',
    });
  });

  it('keeps the canonical settings tab renderer capped and delegated', () => {
    const source = readFileSync(resolve(__dirname, 'SettingsTabContent.tsx'), 'utf8');

    expect(source).toContain("from './SettingsTabContent.logic'");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
