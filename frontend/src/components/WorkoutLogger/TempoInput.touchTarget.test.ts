import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, './TempoInput.tsx'), 'utf8');

describe('TempoInput touch target contract', () => {
  it('keeps every tempo segment at the project 44px touch floor', () => {
    expect(source).toMatch(/const TempoSegment = styled\.input[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;/);
    expect(source).toMatch(/span \{[\s\S]*width: 44px;/);
  });

  it('uses shared WorkoutLogger tokens for placeholder color', () => {
    expect(source).not.toMatch(/rgba\(/);
    expect(source).toContain('withAlpha');
  });
});
