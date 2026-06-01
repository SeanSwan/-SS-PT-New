import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE = readFileSync(resolve(__dirname, 'ScheduleHeader.tsx'), 'utf8');

describe('ScheduleHeader theme bridge', () => {
  it('uses dashboard CSS variables instead of fixed legacy schedule accents', () => {
    expect(SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(SOURCE).toContain('var(--accent-secondary, #8B5CF6)');
    expect(SOURCE).toContain('var(--bg-base, #0A0A0F)');
    expect(SOURCE).toContain('var(--bg-surface, #1A1A24)');

    expect(SOURCE).not.toContain('color="#3b82f6"');
    expect(SOURCE).not.toContain('#00d4ff');
    expect(SOURCE).not.toContain('#7c3aed');
    expect(SOURCE).not.toContain('#1a1a2e');
  });
});
