import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(resolve(process.cwd(), 'src/components/AdvancedCartInteractions.tsx'), 'utf8');

describe('AdvancedCartInteractions truth contract', () => {
  it('does not use Math.random in the live shopping cart interaction layer', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).toContain('createInteractionId');
    expect(SOURCE).toContain('getParticleOffset');
  });
});
